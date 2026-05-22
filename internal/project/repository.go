package project

import (
	"dotkey/db"
	"dotkey/models"

	"gorm.io/gorm"
)

type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

func (r *Repository) Create(p *models.Project) error {
	return db.DB.Create(p).Error
}

func (r *Repository) FindByID(id string) (*models.Project, error) {
	var p models.Project
	err := db.DB.Preload("Owner").First(&p, "id = ?", id).Error
	return &p, err
}

func (r *Repository) FindByUser(userID string) ([]models.Project, error) {
	var projects []models.Project
	err := db.DB.
		Joins("JOIN project_members ON project_members.project_id = projects.id").
		Where("project_members.user_id = ?", userID).
		Preload("Owner").
		Find(&projects).Error
	return projects, err
}

func (r *Repository) Update(p *models.Project) error {
	return db.DB.Save(p).Error
}

// DeleteCascade removes the project and all child data in a single transaction.
func (r *Repository) DeleteCascade(id string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		// collect env IDs
		var envIDs []string
		tx.Model(&models.Environment{}).Where("project_id = ?", id).Pluck("id", &envIDs)

		if len(envIDs) > 0 {
			tx.Where("environment_id IN ?", envIDs).Delete(&models.VariableVersion{})
			tx.Where("environment_id IN ?", envIDs).Delete(&models.Variable{})
			tx.Where("project_id = ?", id).Delete(&models.Environment{})
		}

		tx.Where("project_id = ?", id).Delete(&models.ProjectMember{})
		return tx.Delete(&models.Project{}, "id = ?", id).Error
	})
}

func (r *Repository) GetMember(projectID, userID string) (*models.ProjectMember, error) {
	var m models.ProjectMember
	err := db.DB.Where("project_id = ? AND user_id = ?", projectID, userID).First(&m).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *Repository) AddMember(m *models.ProjectMember) error {
	return db.DB.Create(m).Error
}

func (r *Repository) RemoveMember(projectID, userID string) error {
	return db.DB.Where("project_id = ? AND user_id = ?", projectID, userID).Delete(&models.ProjectMember{}).Error
}

func (r *Repository) ListMembers(projectID string) ([]models.ProjectMember, error) {
	var members []models.ProjectMember
	err := db.DB.Preload("User").Where("project_id = ?", projectID).Find(&members).Error
	return members, err
}

func (r *Repository) UpdateMemberRole(projectID, userID, role string) error {
	return db.DB.Model(&models.ProjectMember{}).
		Where("project_id = ? AND user_id = ?", projectID, userID).
		Update("role", role).Error
}

func (r *Repository) FindUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := db.DB.Where("email = ?", email).First(&user).Error
	return &user, err
}
