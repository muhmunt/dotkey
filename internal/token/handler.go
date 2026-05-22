package token

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) List(c *gin.Context) {
	tokens, err := h.svc.List(c.Param("id"), c.GetString("user_id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tokens)
}

func (h *Handler) Create(c *gin.Context) {
	var input struct {
		Name        string `json:"name" binding:"required"`
		Permissions string `json:"permissions"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plaintext, tok, err := h.svc.Generate(c.Param("id"), c.GetString("user_id"), input.Name, input.Permissions)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token":       plaintext, // shown ONCE — client must copy it
		"id":          tok.ID,
		"name":        tok.Name,
		"permissions": tok.Permissions,
		"prefix":      tok.TokenPrefix,
		"created_at":  tok.CreatedAt,
	})
}

func (h *Handler) Revoke(c *gin.Context) {
	if err := h.svc.Revoke(c.Param("id"), c.Param("tid"), c.GetString("user_id")); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "token revoked"})
}
