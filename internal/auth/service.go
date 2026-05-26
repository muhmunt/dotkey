package auth

import (
	crand "crypto/rand"
	"dotkey/config"
	"dotkey/db"
	"dotkey/models"
	"dotkey/pkg/crypto"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	cfg         *config.Config
	crypto      *crypto.Crypto
	resetTokens sync.Map // requestID -> stateToken (in-memory, 15-min TTL via JWT expiry)
}

func NewService(cfg *config.Config, c *crypto.Crypto) *Service {
	return &Service{cfg: cfg, crypto: c}
}

// ── Standard auth claims ─────────────────────────────────────────────────────

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func (s *Service) Revoke(tokenStr string) error {
	claims, err := s.ValidateToken(tokenStr)
	if err != nil {
		return nil // already invalid, nothing to revoke
	}
	jti := claims.ID
	if jti == "" {
		return nil
	}
	return db.DB.Create(&models.RevokedToken{
		JTI:       jti,
		ExpiresAt: claims.ExpiresAt.Time,
	}).Error
}

// typedClaims are used for short-lived special-purpose tokens (state, reveal).
type typedClaims struct {
	UserID string `json:"user_id"`
	Type   string `json:"type"`
	jwt.RegisteredClaims
}

// ── LoginResult ───────────────────────────────────────────────────────────────

type LoginResult struct {
	Token       string // set when 2FA not enabled
	UserID      string // set in the non-2FA path so the handler can audit-log it
	Requires2FA bool   // set when 2FA is enabled
	StateToken  string // short-lived token to carry through the 2FA step
}

// ── Password reset (2FA-based) ────────────────────────────────────────────────

// RequestPasswordReset stores a short-lived state token server-side and returns
// an opaque requestID. Returns ("", nil) for unknown emails or accounts without
// 2FA — callers always receive the same empty response, preventing enumeration.
func (s *Service) RequestPasswordReset(emailAddr string) (requestID string, err error) {
	var user models.User
	if err := db.DB.Where("email = ?", emailAddr).First(&user).Error; err != nil {
		return "", nil
	}
	if !user.TOTPEnabled {
		return "", nil
	}
	stateToken, err := s.generateTypedToken(user.ID, "password_reset", 15*time.Minute)
	if err != nil {
		return "", err
	}
	id := uuid.New().String()
	s.resetTokens.Store(id, stateToken)
	// auto-evict after 15 min
	go func() {
		time.Sleep(15 * time.Minute)
		s.resetTokens.Delete(id)
	}()
	return id, nil
}

// ResetPassword looks up the state token by requestID, validates TOTP, updates password.
func (s *Service) ResetPassword(requestID, totpCode, newPassword string) error {
	val, ok := s.resetTokens.Load(requestID)
	if !ok {
		return errors.New("session expired, please start over")
	}
	stateToken := val.(string)

	userID, err := s.validateTypedToken(stateToken, "password_reset")
	if err != nil {
		s.resetTokens.Delete(requestID)
		return errors.New("session expired, please start over")
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return errors.New("user not found")
	}
	if err := s.checkTOTP(&user, totpCode); err != nil {
		return err
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	s.resetTokens.Delete(requestID) // single use
	return db.DB.Model(&user).Update("password_hash", string(hashed)).Error
}

// ── Delete account ────────────────────────────────────────────────────────────

func (s *Service) DeleteAccount(userID, password string) error {
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return errors.New("password is incorrect")
	}

	// Block if sole owner of any project
	var soleOwned []string
	rows, err := db.DB.Raw(`
		SELECT p.name FROM projects p
		JOIN project_members pm ON pm.project_id = p.id
		WHERE pm.user_id = ? AND pm.role = 'owner'
		AND (SELECT COUNT(*) FROM project_members WHERE project_id = p.id AND role = 'owner') = 1
	`, userID).Rows()
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var name string
			rows.Scan(&name) //nolint:errcheck
			soleOwned = append(soleOwned, name)
		}
	}
	if len(soleOwned) > 0 {
		return fmt.Errorf("you are the sole owner of: %s — transfer ownership or delete these projects first", joinNames(soleOwned))
	}

	db.DB.Where("user_id = ?", userID).Delete(&models.PasswordResetToken{})
	db.DB.Where("user_id = ?", userID).Delete(&models.DeviceCode{})
	db.DB.Where("user_id = ?", userID).Delete(&models.ProjectMember{})
	return db.DB.Delete(&user).Error
}

func joinNames(names []string) string {
	if len(names) == 1 {
		return fmt.Sprintf("%q", names[0])
	}
	out := make([]string, len(names))
	for i, n := range names {
		out[i] = fmt.Sprintf("%q", n)
	}
	return out[0]
}

// ── Account management ────────────────────────────────────────────────────────

func (s *Service) UpdateName(userID, name string) (*models.User, error) {
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return nil, errors.New("user not found")
	}
	user.Name = name
	if err := db.DB.Save(&user).Error; err != nil {
		return nil, errors.New("failed to update name")
	}
	return &user, nil
}

func (s *Service) ChangePassword(userID, currentPassword, newPassword string) error {
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return errors.New("current password is incorrect")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return db.DB.Model(&user).Update("password_hash", string(hash)).Error
}

// ── Register / Login ──────────────────────────────────────────────────────────

func (s *Service) Register(name, email, password string) (*models.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := &models.User{Name: name, Email: email, PasswordHash: string(hash)}
	if err := db.DB.Create(user).Error; err != nil {
		return nil, errors.New("email already registered")
	}
	return user, nil
}

func (s *Service) Login(email, password string) (*LoginResult, error) {
	var user models.User
	if err := db.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	if user.TOTPEnabled {
		st, err := s.generateTypedToken(user.ID, "2fa_state", 5*time.Minute)
		if err != nil {
			return nil, err
		}
		return &LoginResult{Requires2FA: true, StateToken: st}, nil
	}

	token, err := s.GenerateToken(user.ID)
	if err != nil {
		return nil, err
	}
	return &LoginResult{Token: token, UserID: user.ID}, nil
}

// Complete2FALogin validates a state token + TOTP code and issues a full JWT.
func (s *Service) Complete2FALogin(stateToken, code string) (token, userID string, err error) {
	userID, err = s.validateTypedToken(stateToken, "2fa_state")
	if err != nil {
		return "", "", errors.New("session expired, please log in again")
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return "", "", errors.New("user not found")
	}

	if err := s.checkTOTP(&user, code); err != nil {
		return "", "", err
	}

	token, err = s.GenerateToken(userID)
	return token, userID, err
}

// ── TOTP 2FA ──────────────────────────────────────────────────────────────────

// SetupTOTP generates a new TOTP secret, stores it encrypted (not enabled yet),
// and returns the otpauth:// URL for rendering as a QR code.
func (s *Service) SetupTOTP(userID string) (string, error) {
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return "", errors.New("user not found")
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "EnvX",
		AccountName: user.Email,
	})
	if err != nil {
		return "", err
	}

	encrypted, err := s.crypto.Encrypt(key.Secret())
	if err != nil {
		return "", err
	}

	// store secret in pending state (totp_enabled stays false until confirmed)
	if err := db.DB.Model(&user).Update("totp_secret", encrypted).Error; err != nil {
		return "", err
	}

	return key.URL(), nil
}

// ConfirmTOTP validates the first code from the authenticator, enables 2FA,
// and returns a fresh set of 8 one-time backup codes.
func (s *Service) ConfirmTOTP(userID, code string) ([]string, error) {
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return nil, errors.New("user not found")
	}
	if user.TOTPSecret == "" {
		return nil, errors.New("run 2FA setup first")
	}
	if err := s.checkTOTP(&user, code); err != nil {
		return nil, err
	}
	if err := db.DB.Model(&user).Update("totp_enabled", true).Error; err != nil {
		return nil, err
	}
	return s.generateBackupCodes(userID)
}

// BackupCodeCount returns how many unused backup codes the user has left.
func (s *Service) BackupCodeCount(userID string) (int64, error) {
	var count int64
	err := db.DB.Model(&models.BackupCode{}).
		Where("user_id = ? AND used_at IS NULL", userID).
		Count(&count).Error
	return count, err
}

// RegenerateBackupCodes replaces all existing codes and returns 8 new plaintext ones.
// Requires a valid TOTP code as confirmation.
func (s *Service) RegenerateBackupCodes(userID, totpCode string) ([]string, error) {
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return nil, errors.New("user not found")
	}
	if !user.TOTPEnabled {
		return nil, errors.New("2FA is not enabled")
	}
	if err := s.checkTOTP(&user, totpCode); err != nil {
		return nil, err
	}
	return s.generateBackupCodes(userID)
}

// LoginWithBackupCode validates an opaque backup code and issues a full JWT.
func (s *Service) LoginWithBackupCode(stateToken, rawCode string) (token, userID string, err error) {
	userID, err = s.validateTypedToken(stateToken, "2fa_state")
	if err != nil {
		return "", "", errors.New("session expired, please log in again")
	}

	normalized := normalizeBackupCode(rawCode)
	var codes []models.BackupCode
	if err := db.DB.Where("user_id = ? AND used_at IS NULL", userID).Find(&codes).Error; err != nil {
		return "", "", errors.New("could not verify backup code")
	}
	for _, c := range codes {
		if err := bcrypt.CompareHashAndPassword([]byte(c.CodeHash), []byte(normalized)); err == nil {
			now := time.Now()
			db.DB.Model(&c).Update("used_at", &now)
			token, err = s.GenerateToken(userID)
			return token, userID, err
		}
	}
	return "", "", errors.New("invalid backup code")
}

// generateBackupCodes deletes existing codes and creates 8 new ones.
// Returns plaintext codes — shown to the user once.
func (s *Service) generateBackupCodes(userID string) ([]string, error) {
	db.DB.Where("user_id = ?", userID).Delete(&models.BackupCode{})

	const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	plain := make([]string, 8)
	for i := range plain {
		b := make([]byte, 8)
		if _, err := crand.Read(b); err != nil {
			return nil, err
		}
		code := make([]byte, 8)
		for j := range code {
			code[j] = codeChars[b[j]%32]
		}
		plain[i] = string(code[:4]) + "-" + string(code[4:])
	}

	for _, p := range plain {
		hash, err := bcrypt.GenerateFromPassword([]byte(normalizeBackupCode(p)), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		db.DB.Create(&models.BackupCode{UserID: userID, CodeHash: string(hash)})
	}
	return plain, nil
}

func normalizeBackupCode(code string) string {
	// strip hyphens and uppercase before comparison
	result := make([]byte, 0, len(code))
	for i := 0; i < len(code); i++ {
		c := code[i]
		if c == '-' {
			continue
		}
		if c >= 'a' && c <= 'z' {
			c -= 32
		}
		result = append(result, c)
	}
	return string(result)
}

// DisableTOTP requires a valid code before removing 2FA from the account.
func (s *Service) DisableTOTP(userID, code string) error {
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return errors.New("user not found")
	}
	if !user.TOTPEnabled {
		return errors.New("2FA is not enabled")
	}
	if err := s.checkTOTP(&user, code); err != nil {
		return err
	}
	return db.DB.Model(&user).Updates(map[string]any{
		"totp_enabled": false,
		"totp_secret":  "",
	}).Error
}

// UnlockReveal validates a TOTP code and issues a 15-minute reveal token.
func (s *Service) UnlockReveal(userID, code string) (string, error) {
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return "", errors.New("user not found")
	}
	if !user.TOTPEnabled {
		return "", errors.New("2FA is not enabled on this account")
	}
	if err := s.checkTOTP(&user, code); err != nil {
		return "", err
	}
	return s.generateTypedToken(userID, "reveal", 15*time.Minute)
}

// checkTOTP decrypts the stored secret and validates the code.
func (s *Service) checkTOTP(user *models.User, code string) error {
	secret, err := s.crypto.Decrypt(user.TOTPSecret)
	if err != nil {
		return errors.New("2FA configuration error")
	}
	if !totp.Validate(code, secret) {
		return errors.New("invalid 2FA code")
	}
	return nil
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

func (s *Service) GenerateToken(userID string) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *Service) ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func (s *Service) generateTypedToken(userID, tokenType string, ttl time.Duration) (string, error) {
	claims := typedClaims{
		UserID: userID,
		Type:   tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *Service) validateTypedToken(tokenStr, expectedType string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &typedClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return "", errors.New("invalid or expired token")
	}
	claims, ok := token.Claims.(*typedClaims)
	if !ok || !token.Valid || claims.Type != expectedType {
		return "", errors.New("invalid token type")
	}
	return claims.UserID, nil
}

// ── Reveal middleware ─────────────────────────────────────────────────────────

// RevealMiddleware blocks export if user has 2FA enabled and has no valid reveal token.
// CI/CD project tokens bypass this check entirely.
func (s *Service) RevealMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// project tokens (CI/CD) skip the reveal lock
		if isToken, _ := c.Get("is_token_auth"); isToken == true {
			c.Next()
			return
		}

		user, _ := c.Get("user")
		u := user.(*models.User)

		if !u.TOTPEnabled {
			c.Next()
			return
		}

		revealToken := c.GetHeader("X-Reveal-Token")
		if revealToken == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "reveal_locked",
				"message": "enter your 2FA code to reveal secrets",
			})
			return
		}

		if _, err := s.validateTypedToken(revealToken, "reveal"); err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "reveal_expired",
				"message": "reveal session expired, enter your 2FA code again",
			})
			return
		}

		c.Next()
	}
}

