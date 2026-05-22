package environment

import (
	"dotkey/db"
	"dotkey/models"

	"gorm.io/gorm"
)

type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

func (r *Repository) Create(e *models.Environment) error {
	return db.DB.Create(e).Error
}

func (r *Repository) FindByID(id string) (*models.Environment, error) {
	var e models.Environment
	err := db.DB.First(&e, "id = ?", id).Error
	return &e, err
}

func (r *Repository) FindByProject(projectID string) ([]models.Environment, error) {
	var envs []models.Environment
	err := db.DB.Where("project_id = ?", projectID).Find(&envs).Error
	return envs, err
}

func (r *Repository) Update(e *models.Environment) error {
	return db.DB.Save(e).Error
}

// DeleteCascade removes the environment plus all variables and versions.
func (r *Repository) DeleteCascade(id string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		tx.Where("environment_id = ?", id).Delete(&models.VariableVersion{})
		tx.Where("environment_id = ?", id).Delete(&models.Variable{})
		return tx.Delete(&models.Environment{}, "id = ?", id).Error
	})
}
