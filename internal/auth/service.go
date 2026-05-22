package auth

import (
	"dotkey/config"
	"dotkey/db"
	"dotkey/models"
	"dotkey/pkg/crypto"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	cfg    *config.Config
	crypto *crypto.Crypto
}

func NewService(cfg *config.Config, c *crypto.Crypto) *Service {
	return &Service{cfg: cfg, crypto: c}
}

// ── Standard auth claims ─────────────────────────────────────────────────────

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
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
	Requires2FA bool   // set when 2FA is enabled
	StateToken  string // short-lived token to carry through the 2FA step
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
	return &LoginResult{Token: token}, nil
}

// Complete2FALogin validates a state token + TOTP code and issues a full JWT.
func (s *Service) Complete2FALogin(stateToken, code string) (string, error) {
	userID, err := s.validateTypedToken(stateToken, "2fa_state")
	if err != nil {
		return "", errors.New("session expired, please log in again")
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return "", errors.New("user not found")
	}

	if err := s.checkTOTP(&user, code); err != nil {
		return "", err
	}

	return s.GenerateToken(userID)
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

// ConfirmTOTP validates the first code from the authenticator and enables 2FA.
func (s *Service) ConfirmTOTP(userID, code string) error {
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return errors.New("user not found")
	}
	if user.TOTPSecret == "" {
		return errors.New("run 2FA setup first")
	}
	if err := s.checkTOTP(&user, code); err != nil {
		return err
	}
	return db.DB.Model(&user).Update("totp_enabled", true).Error
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

