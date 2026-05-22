package environment

import (
	"dotkey/models"
	"errors"
)

// ProjectAccess is satisfied by project.Service.
type ProjectAccess interface {
	GetMemberRole(projectID, userID string) (string, error)
}

type Service struct {
	repo    *Repository
	projSvc ProjectAccess
}

func NewService(repo *Repository, projSvc ProjectAccess) *Service {
	return &Service{repo: repo, projSvc: projSvc}
}

func (s *Service) List(projectID, userID string) ([]models.Environment, error) {
	if _, err := s.projSvc.GetMemberRole(projectID, userID); err != nil {
		return nil, errors.New("project not found")
	}
	return s.repo.FindByProject(projectID)
}

func (s *Service) Create(projectID, name, userID string) (*models.Environment, error) {
	role, err := s.projSvc.GetMemberRole(projectID, userID)
	if err != nil {
		return nil, errors.New("project not found")
	}
	if role == "readonly" {
		return nil, errors.New("insufficient permissions")
	}
	e := &models.Environment{ProjectID: projectID, Name: name}
	return e, s.repo.Create(e)
}

func (s *Service) GetByID(projectID, envID, userID string) (*models.Environment, error) {
	if _, err := s.projSvc.GetMemberRole(projectID, userID); err != nil {
		return nil, errors.New("project not found")
	}
	env, err := s.repo.FindByID(envID)
	if err != nil || env.ProjectID != projectID {
		return nil, errors.New("environment not found")
	}
	return env, nil
}

// Rename — owner, admin only.
func (s *Service) Rename(projectID, envID, name, userID string) (*models.Environment, error) {
	role, err := s.projSvc.GetMemberRole(projectID, userID)
	if err != nil {
		return nil, errors.New("project not found")
	}
	if role != "owner" && role != "admin" {
		return nil, errors.New("insufficient permissions")
	}
	env, err := s.repo.FindByID(envID)
	if err != nil || env.ProjectID != projectID {
		return nil, errors.New("environment not found")
	}
	env.Name = name
	return env, s.repo.Update(env)
}

// SetLock toggles the locked state — owner, admin only.
func (s *Service) SetLock(projectID, envID string, locked bool, userID string) (*models.Environment, error) {
	role, err := s.projSvc.GetMemberRole(projectID, userID)
	if err != nil {
		return nil, errors.New("project not found")
	}
	if role != "owner" && role != "admin" {
		return nil, errors.New("insufficient permissions")
	}
	env, err := s.repo.FindByID(envID)
	if err != nil || env.ProjectID != projectID {
		return nil, errors.New("environment not found")
	}
	env.Locked = locked
	return env, s.repo.Update(env)
}

// Delete — owner, admin only. Cascades variables and versions.
func (s *Service) Delete(projectID, envID, userID string) error {
	role, err := s.projSvc.GetMemberRole(projectID, userID)
	if err != nil {
		return errors.New("project not found")
	}
	if role != "owner" && role != "admin" {
		return errors.New("insufficient permissions")
	}
	env, err := s.repo.FindByID(envID)
	if err != nil || env.ProjectID != projectID {
		return errors.New("environment not found")
	}
	return s.repo.DeleteCascade(envID)
}
