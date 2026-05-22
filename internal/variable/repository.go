package variable

import (
	"dotkey/db"
	"dotkey/models"
)

type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

func (r *Repository) Create(v *models.Variable) error {
	return db.DB.Create(v).Error
}

func (r *Repository) FindByID(id string) (*models.Variable, error) {
	var v models.Variable
	err := db.DB.First(&v, "id = ?", id).Error
	return &v, err
}

func (r *Repository) FindByEnvironment(envID string) ([]models.Variable, error) {
	var vars []models.Variable
	err := db.DB.Where("environment_id = ?", envID).Order("key ASC").Find(&vars).Error
	return vars, err
}

func (r *Repository) FindByKey(envID, key string) (*models.Variable, error) {
	var v models.Variable
	err := db.DB.Where("environment_id = ? AND key = ?", envID, key).First(&v).Error
	return &v, err
}

func (r *Repository) Update(v *models.Variable) error {
	return db.DB.Save(v).Error
}

func (r *Repository) Delete(id string) error {
	return db.DB.Delete(&models.Variable{}, "id = ?", id).Error
}
