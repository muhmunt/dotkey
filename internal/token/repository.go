package token

import (
	"dotkey/db"
	"dotkey/models"
	"time"
)

type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

func (r *Repository) Create(t *models.ProjectToken) error {
	return db.DB.Create(t).Error
}

func (r *Repository) FindByHash(hash string) (*models.ProjectToken, error) {
	var t models.ProjectToken
	err := db.DB.Where("token_hash = ?", hash).First(&t).Error
	return &t, err
}

func (r *Repository) ListByProject(projectID string) ([]models.ProjectToken, error) {
	var tokens []models.ProjectToken
	err := db.DB.Where("project_id = ?", projectID).Order("created_at DESC").Find(&tokens).Error
	return tokens, err
}

func (r *Repository) Delete(id, projectID string) error {
	return db.DB.Where("id = ? AND project_id = ?", id, projectID).Delete(&models.ProjectToken{}).Error
}

func (r *Repository) UpdateLastUsed(id string) {
	now := time.Now()
	db.DB.Model(&models.ProjectToken{}).Where("id = ?", id).Update("last_used_at", now)
}
