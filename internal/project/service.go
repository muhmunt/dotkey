package project

import (
	"dotkey/models"
	"errors"
	"fmt"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(name, description, ownerID string) (*models.Project, error) {
	p := &models.Project{Name: name, Description: description, OwnerID: ownerID}
	if err := s.repo.Create(p); err != nil {
		return nil, err
	}
	s.repo.AddMember(&models.ProjectMember{ProjectID: p.ID, UserID: ownerID, Role: "owner"})
	return p, nil
}

func (s *Service) GetByID(id, userID string) (*models.Project, error) {
	if _, err := s.repo.GetMember(id, userID); err != nil {
		return nil, errors.New("project not found")
	}
	return s.repo.FindByID(id)
}

func (s *Service) ListByUser(userID string) ([]models.Project, error) {
	return s.repo.FindByUser(userID)
}

func (s *Service) Update(id, userID, name, description string) (*models.Project, error) {
	member, err := s.repo.GetMember(id, userID)
	if err != nil {
		return nil, errors.New("project not found")
	}
	if member.Role != "owner" && member.Role != "admin" {
		return nil, errors.New("insufficient permissions")
	}

	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("project not found")
	}

	if name != "" {
		p.Name = name
	}
	if description != "" {
		p.Description = description
	}
	return p, s.repo.Update(p)
}

func (s *Service) Delete(id, userID string) error {
	member, err := s.repo.GetMember(id, userID)
	if err != nil {
		return errors.New("project not found")
	}
	if member.Role != "owner" {
		return errors.New("only the owner can delete a project")
	}
	return s.repo.DeleteCascade(id)
}

func (s *Service) GetMemberRole(projectID, userID string) (string, error) {
	member, err := s.repo.GetMember(projectID, userID)
	if err != nil {
		return "", errors.New("not a member of this project")
	}
	return member.Role, nil
}

func (s *Service) ListMembers(projectID, userID string) ([]models.ProjectMember, error) {
	if _, err := s.repo.GetMember(projectID, userID); err != nil {
		return nil, errors.New("project not found")
	}
	return s.repo.ListMembers(projectID)
}

// AddMemberByEmail looks up the user by email then adds them to the project.
func (s *Service) AddMemberByEmail(projectID, actorID, email, role string) error {
	actor, err := s.repo.GetMember(projectID, actorID)
	if err != nil {
		return errors.New("project not found")
	}
	if actor.Role != "owner" && actor.Role != "admin" {
		return errors.New("insufficient permissions")
	}

	validRoles := map[string]bool{"admin": true, "developer": true, "readonly": true}
	if !validRoles[role] {
		return errors.New("invalid role: must be admin, developer, or readonly")
	}

	user, err := s.repo.FindUserByEmail(email)
	if err != nil {
		return fmt.Errorf("no account found with email %q", email)
	}

	return s.repo.AddMember(&models.ProjectMember{
		ProjectID: projectID,
		UserID:    user.ID,
		Role:      role,
	})
}

func (s *Service) UpdateMemberRole(projectID, actorID, targetUserID, role string) error {
	actor, err := s.repo.GetMember(projectID, actorID)
	if err != nil {
		return errors.New("project not found")
	}
	if actor.Role != "owner" && actor.Role != "admin" {
		return errors.New("insufficient permissions")
	}

	target, err := s.repo.GetMember(projectID, targetUserID)
	if err != nil {
		return errors.New("member not found")
	}
	if target.Role == "owner" {
		return errors.New("cannot change the owner's role")
	}

	validRoles := map[string]bool{"admin": true, "developer": true, "readonly": true}
	if !validRoles[role] {
		return errors.New("invalid role: must be admin, developer, or readonly")
	}

	return s.repo.UpdateMemberRole(projectID, targetUserID, role)
}

func (s *Service) RemoveMember(projectID, actorID, targetUserID string) error {
	actor, err := s.repo.GetMember(projectID, actorID)
	if err != nil {
		return errors.New("project not found")
	}
	if actor.Role != "owner" && actor.Role != "admin" {
		return errors.New("insufficient permissions")
	}

	target, err := s.repo.GetMember(projectID, targetUserID)
	if err != nil {
		return errors.New("member not found")
	}
	if target.Role == "owner" {
		return errors.New("cannot remove the owner")
	}

	return s.repo.RemoveMember(projectID, targetUserID)
}
