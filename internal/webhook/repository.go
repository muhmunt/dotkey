package webhook

import (
	"dotkey/db"
	"dotkey/models"
)

type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

func (r *Repository) FindByProject(projectID string) ([]models.Webhook, error) {
	var hooks []models.Webhook
	return hooks, db.DB.Where("project_id = ?", projectID).Order("created_at asc").Find(&hooks).Error
}

func (r *Repository) Create(w *models.Webhook) error {
	return db.DB.Create(w).Error
}

func (r *Repository) Delete(id, projectID string) error {
	return db.DB.Where("id = ? AND project_id = ?", id, projectID).Delete(&models.Webhook{}).Error
}

func (r *Repository) FindActiveByProject(projectID string) ([]models.Webhook, error) {
	var hooks []models.Webhook
	return hooks, db.DB.Where("project_id = ? AND active = true", projectID).Find(&hooks).Error
}
