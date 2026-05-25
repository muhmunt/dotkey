package version

import (
	"dotkey/db"
	"dotkey/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// EnvAccess is satisfied by environment.Service.
type EnvAccess interface {
	GetByID(projectID, envID, userID string) (*models.Environment, error)
}

type Handler struct {
	repo   *Repository
	envSvc EnvAccess
}

func NewHandler(repo *Repository, envSvc EnvAccess) *Handler {
	return &Handler{repo: repo, envSvc: envSvc}
}

func (h *Handler) History(c *gin.Context) {
	if _, err := h.envSvc.GetByID(c.Param("id"), c.Param("eid"), c.GetString("user_id")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "environment not found"})
		return
	}

	limit, offset := 50, 0
	if v, err := strconv.Atoi(c.Query("limit")); err == nil && v > 0 {
		limit = v
	}
	if v, err := strconv.Atoi(c.Query("offset")); err == nil && v >= 0 {
		offset = v
	}

	versions, err := h.repo.FindByEnvironment(c.Param("eid"), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, versions)
}

func (h *Handler) Rollback(c *gin.Context) {
	userID := c.GetString("user_id")

	if _, err := h.envSvc.GetByID(c.Param("id"), c.Param("eid"), userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "environment not found"})
		return
	}

	ver, err := h.repo.FindByID(c.Param("vid"))
	if err != nil || ver.EnvironmentID != c.Param("eid") {
		c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
		return
	}

	var variable models.Variable
	if err := db.DB.First(&variable, "id = ?", ver.VariableID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "variable no longer exists"})
		return
	}

	db.DB.Model(&variable).Update("value", ver.Value)

	db.DB.Create(&models.VariableVersion{
		VariableID:    variable.ID,
		EnvironmentID: ver.EnvironmentID,
		Key:           ver.Key,
		Value:         ver.Value,
		Action:        "rolled_back",
		ActorID:       userID,
	})

	c.JSON(http.StatusOK, gin.H{"message": "rolled back to version " + ver.ID, "key": ver.Key})
}
