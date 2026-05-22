package activity

import (
	"dotkey/db"
	"dotkey/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	repo    *Repository
	projSvc ProjectAccess
}

type ProjectAccess interface {
	GetMemberRole(projectID, userID string) (string, error)
}

func NewHandler(repo *Repository, projSvc ProjectAccess) *Handler {
	return &Handler{repo: repo, projSvc: projSvc}
}

func (h *Handler) List(c *gin.Context) {
	projectID := c.Param("id")
	userID := c.GetString("user_id")

	if _, err := h.projSvc.GetMemberRole(projectID, userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	envFilter := c.Query("env")
	actionFilter := c.Query("action")

	limit := 50
	offset := 0
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	// validate envFilter belongs to this project
	if envFilter != "" {
		var env models.Environment
		if err := db.DB.Where("id = ? AND project_id = ?", envFilter, projectID).First(&env).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "environment not found in this project"})
			return
		}
	}

	entries, err := h.repo.ListByProject(projectID, envFilter, actionFilter, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if entries == nil {
		entries = []ActivityEntry{}
	}
	c.JSON(http.StatusOK, entries)
}
