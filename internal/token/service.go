package token

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"dotkey/models"
	"errors"
)

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

// Generate creates a new project token and returns the plaintext value (shown once).
func (s *Service) Generate(projectID, actorID, name, permissions string) (plaintext string, token *models.ProjectToken, err error) {
	role, err := s.projSvc.GetMemberRole(projectID, actorID)
	if err != nil {
		return "", nil, errors.New("project not found")
	}
	if role != "owner" && role != "admin" {
		return "", nil, errors.New("only owners and admins can create tokens")
	}

	if permissions != "read" && permissions != "read_write" {
		permissions = "read"
	}

	raw := generateRaw()
	hash := hashToken(raw)

	t := &models.ProjectToken{
		ProjectID:   projectID,
		Name:        name,
		TokenHash:   hash,
		TokenPrefix: raw[:16],
		Permissions: permissions,
		CreatedByID: actorID,
	}
	if err := s.repo.Create(t); err != nil {
		return "", nil, err
	}
	return raw, t, nil
}

func (s *Service) List(projectID, actorID string) ([]models.ProjectToken, error) {
	if _, err := s.projSvc.GetMemberRole(projectID, actorID); err != nil {
		return nil, errors.New("project not found")
	}
	return s.repo.ListByProject(projectID)
}

func (s *Service) Revoke(projectID, tokenID, actorID string) error {
	role, err := s.projSvc.GetMemberRole(projectID, actorID)
	if err != nil {
		return errors.New("project not found")
	}
	if role != "owner" && role != "admin" {
		return errors.New("only owners and admins can revoke tokens")
	}
	return s.repo.Delete(tokenID, projectID)
}

func generateRaw() string {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return "dotkey_tok_" + hex.EncodeToString(b)
}

func hashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

// HashForLookup is used by the auth middleware to verify incoming tokens.
func HashForLookup(raw string) string {
	return hashToken(raw)
}
