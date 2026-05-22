package search

import (
	"dotkey/db"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type Result struct {
	Type            string `json:"type"` // "project" or "variable"
	ID              string `json:"id"`
	Name            string `json:"name,omitempty"`
	Key             string `json:"key,omitempty"`
	ProjectID       string `json:"project_id,omitempty"`
	ProjectName     string `json:"project_name,omitempty"`
	EnvironmentID   string `json:"environment_id,omitempty"`
	EnvironmentName string `json:"environment_name,omitempty"`
	UpdatedAt       *time.Time `json:"updated_at,omitempty"`
}

func Search(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	userID := c.GetString("user_id")

	if len(q) < 1 {
		c.JSON(http.StatusOK, []Result{})
		return
	}

	pattern := "%" + strings.ToLower(q) + "%"
	var results []Result

	// search projects
	projectRows, err := db.DB.Raw(`
		SELECT p.id, p.name
		FROM projects p
		JOIN project_members pm ON pm.project_id = p.id
		WHERE pm.user_id = ? AND LOWER(p.name) LIKE ?
		LIMIT 5`, userID, pattern).Rows()
	if err == nil {
		defer projectRows.Close()
		for projectRows.Next() {
			var r Result
			projectRows.Scan(&r.ID, &r.Name) //nolint:errcheck
			r.Type = "project"
			results = append(results, r)
		}
	}

	// search variable keys
	varRows, err := db.DB.Raw(`
		SELECT v.id, v.key, v.updated_at,
		       e.id AS env_id, e.name AS env_name,
		       p.id AS proj_id, p.name AS proj_name
		FROM variables v
		JOIN environments e ON e.id = v.environment_id
		JOIN projects p ON p.id = e.project_id
		JOIN project_members pm ON pm.project_id = p.id
		WHERE pm.user_id = ? AND LOWER(v.key) LIKE ?
		ORDER BY v.updated_at DESC
		LIMIT 15`, userID, pattern).Rows()
	if err == nil {
		defer varRows.Close()
		for varRows.Next() {
			var r Result
			var updated time.Time
			varRows.Scan(&r.ID, &r.Key, &updated, &r.EnvironmentID, &r.EnvironmentName, &r.ProjectID, &r.ProjectName) //nolint:errcheck
			r.Type = "variable"
			r.UpdatedAt = &updated
			results = append(results, r)
		}
	}

	if results == nil {
		results = []Result{}
	}
	c.JSON(http.StatusOK, results)
}
