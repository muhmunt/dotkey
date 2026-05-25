package environment

import (
	"dotkey/models"
	"errors"
)

// ProjectAccess is satisfied by project.Service.
type ProjectAccess interface {
	GetMemberRole(projectID, userID string) (string, error)
}

// VariableCopier is satisfied by variable.Service.
type VariableCopier interface {
	CopyToEnvironment(projectID, srcEnvID, dstEnvID, actorID string) (int, error)
}

type Service struct {
	repo    *Repository
	projSvc ProjectAccess
	varSvc  VariableCopier
}

func NewService(repo *Repository, projSvc ProjectAccess) *Service {
	return &Service{repo: repo, projSvc: projSvc}
}

func (s *Service) SetVariableCopier(vc VariableCopier) { s.varSvc = vc }

// Clone copies all variables from srcEnvID into dstEnvID — developer+ role required on both.
func (s *Service) Clone(projectID, srcEnvID, dstEnvID, userID string) (int, error) {
	role, err := s.projSvc.GetMemberRole(projectID, userID)
	if err != nil {
		return 0, errors.New("project not found")
	}
	if role == "readonly" {
		return 0, errors.New("insufficient permissions")
	}
	src, err := s.repo.FindByID(srcEnvID)
	if err != nil || src.ProjectID != projectID {
		return 0, errors.New("source environment not found")
	}
	dst, err := s.repo.FindByID(dstEnvID)
	if err != nil || dst.ProjectID != projectID {
		return 0, errors.New("target environment not found")
	}
	if dst.Locked {
		return 0, errors.New("target environment is locked")
	}
	if s.varSvc == nil {
		return 0, errors.New("clone not available")
	}
	return s.varSvc.CopyToEnvironment(projectID, srcEnvID, dstEnvID, userID)
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
