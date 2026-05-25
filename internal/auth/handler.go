package auth

import (
	"crypto/rand"
	"dotkey/db"
	"dotkey/models"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Register(c *gin.Context) {
	var input struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.svc.Register(input.Name, input.Email, input.Password)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	token, err := h.svc.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"user": user, "token": token})
}

func (h *Handler) Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.svc.Login(input.Email, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if result.Requires2FA {
		c.JSON(http.StatusOK, gin.H{
			"requires_2fa": true,
			"state_token":  result.StateToken,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": result.Token})
}

// Login2FA completes a login when 2FA is enabled.
// Takes state_token (from Login) + TOTP code.
func (h *Handler) Login2FA(c *gin.Context) {
	var input struct {
		StateToken string `json:"state_token" binding:"required"`
		Code       string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := h.svc.Complete2FALogin(input.StateToken, input.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (h *Handler) Me(c *gin.Context) {
	c.JSON(http.StatusOK, CurrentUser(c))
}

func (h *Handler) UpdateMe(c *gin.Context) {
	var input struct {
		Name string `json:"name" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	user, err := h.svc.UpdateName(CurrentUser(c).ID, input.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) ChangePassword(c *gin.Context) {
	var input struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.ChangePassword(CurrentUser(c).ID, input.CurrentPassword, input.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "password updated"})
}

func (h *Handler) Logout(c *gin.Context) {
	token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
	h.svc.Revoke(token) //nolint:errcheck — best-effort revocation
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (h *Handler) ForgotPassword(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid email is required"})
		return
	}
	h.svc.RequestPasswordReset(input.Email) //nolint:errcheck — always silent
	c.JSON(http.StatusOK, gin.H{"message": "if that email exists, a reset link has been sent"})
}

func (h *Handler) ResetPassword(c *gin.Context) {
	var input struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.ResetPassword(input.Token, input.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "password reset successfully"})
}

func (h *Handler) DeleteMe(c *gin.Context) {
	var input struct {
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password is required"})
		return
	}
	if err := h.svc.DeleteAccount(CurrentUser(c).ID, input.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "account deleted"})
}

// Refresh issues a new 24h JWT for the currently authenticated user.
func (h *Handler) Refresh(c *gin.Context) {
	token, err := h.svc.GenerateToken(CurrentUser(c).ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to refresh token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}

// ── 2FA management ────────────────────────────────────────────────────────────

// Setup2FA generates a TOTP secret and returns a QR code URL.
func (h *Handler) Setup2FA(c *gin.Context) {
	user := CurrentUser(c)
	if user.TOTPEnabled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "2FA is already enabled"})
		return
	}

	qrURL, err := h.svc.SetupTOTP(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"qr_url": qrURL})
}

// Confirm2FA validates the first scan and enables 2FA on the account.
func (h *Handler) Confirm2FA(c *gin.Context) {
	var input struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.ConfirmTOTP(CurrentUser(c).ID, input.Code); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "2FA enabled"})
}

// Disable2FA requires the current TOTP code before removing 2FA.
func (h *Handler) Disable2FA(c *gin.Context) {
	var input struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.DisableTOTP(CurrentUser(c).ID, input.Code); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "2FA disabled"})
}

// RevealUnlock validates TOTP code and issues a short-lived reveal token.
func (h *Handler) RevealUnlock(c *gin.Context) {
	var input struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	revealToken, err := h.svc.UnlockReveal(CurrentUser(c).ID, input.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reveal_token": revealToken,
		"expires_in":   900, // 15 minutes
	})
}

// ── Device flow ───────────────────────────────────────────────────────────────

func (h *Handler) DeviceCode(c *gin.Context) {
	dc := &models.DeviceCode{
		DeviceCode: uuid.New().String(),
		UserCode:   generateUserCode(),
		ExpiresAt:  time.Now().Add(15 * time.Minute),
	}
	if err := db.DB.Create(dc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create device code"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"device_code": dc.DeviceCode,
		"user_code":   dc.UserCode,
		"expires_in":  900,
	})
}

func (h *Handler) DevicePoll(c *gin.Context) {
	deviceCode := c.Query("device_code")
	if deviceCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "device_code is required"})
		return
	}

	var dc models.DeviceCode
	if err := db.DB.Where("device_code = ?", deviceCode).First(&dc).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "device code not found"})
		return
	}

	if time.Now().After(dc.ExpiresAt) {
		c.JSON(http.StatusGone, gin.H{"error": "device code expired"})
		return
	}

	if dc.Token == "" {
		c.JSON(http.StatusAccepted, gin.H{"status": "pending"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": dc.Token})
}

func (h *Handler) DeviceActivate(c *gin.Context) {
	user := CurrentUser(c)

	var input struct {
		UserCode string `json:"user_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var dc models.DeviceCode
	if err := db.DB.Where("user_code = ?", strings.ToUpper(input.UserCode)).First(&dc).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invalid activation code"})
		return
	}

	if time.Now().After(dc.ExpiresAt) {
		c.JSON(http.StatusGone, gin.H{"error": "activation code expired"})
		return
	}

	token, err := h.svc.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	db.DB.Model(&dc).Updates(map[string]any{"user_id": user.ID, "token": token})
	c.JSON(http.StatusOK, gin.H{"message": "device activated"})
}

func generateUserCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	code := make([]byte, 8)
	for i := range code {
		code[i] = chars[b[i]%32]
	}
	return string(code[:4]) + "-" + string(code[4:])
}
