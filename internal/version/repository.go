package version

import (
	"dotkey/db"
	"dotkey/models"
)

type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

func (r *Repository) FindByEnvironment(envID string) ([]models.VariableVersion, error) {
	var versions []models.VariableVersion
	err := db.DB.
		Preload("Actor").
		Where("environment_id = ?", envID).
		Order("created_at DESC").
		Find(&versions).Error
	return versions, err
}

func (r *Repository) FindByID(id string) (*models.VariableVersion, error) {
	var v models.VariableVersion
	err := db.DB.First(&v, "id = ?", id).Error
	return &v, err
}
