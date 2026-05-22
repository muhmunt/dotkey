package variable

import (
	"dotkey/db"
	"dotkey/models"
	"dotkey/pkg/crypto"
	"errors"
	"fmt"
	"strings"
	"time"
)

// EnvAccess is satisfied by environment.Service.
type EnvAccess interface {
	GetByID(projectID, envID, userID string) (*models.Environment, error)
}

// ProjectAccess is satisfied by project.Service.
type ProjectAccess interface {
	GetMemberRole(projectID, userID string) (string, error)
}

type Service struct {
	repo    *Repository
	envSvc  EnvAccess
	projSvc ProjectAccess
	crypto  *crypto.Crypto
}

func NewService(repo *Repository, envSvc EnvAccess, projSvc ProjectAccess, c *crypto.Crypto) *Service {
	return &Service{repo: repo, envSvc: envSvc, projSvc: projSvc, crypto: c}
}

type VariableResponse struct {
	ID            string    `json:"id"`
	EnvironmentID string    `json:"environment_id"`
	Key           string    `json:"key"`
	Value         string    `json:"value"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// canEdit enforces that the user has at least developer role.
func (s *Service) canEdit(projectID, userID string) error {
	role, err := s.projSvc.GetMemberRole(projectID, userID)
	if err != nil {
		return errors.New("project not found")
	}
	if role == "readonly" {
		return errors.New("insufficient permissions: read-only members cannot modify variables")
	}
	return nil
}

// canDelete enforces that the user is owner or admin.
func (s *Service) canDelete(projectID, userID string) error {
	role, err := s.projSvc.GetMemberRole(projectID, userID)
	if err != nil {
		return errors.New("project not found")
	}
	if role != "owner" && role != "admin" {
		return errors.New("insufficient permissions: only owners and admins can delete variables")
	}
	return nil
}

// List — all members can view (values always masked).
func (s *Service) List(projectID, envID, userID string) ([]VariableResponse, error) {
	if _, err := s.envSvc.GetByID(projectID, envID, userID); err != nil {
		return nil, err
	}
	vars, err := s.repo.FindByEnvironment(envID)
	if err != nil {
		return nil, err
	}
	result := make([]VariableResponse, len(vars))
	for i, v := range vars {
		result[i] = VariableResponse{
			ID: v.ID, EnvironmentID: v.EnvironmentID,
			Key: v.Key, Value: "***",
			CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt,
		}
	}
	return result, nil
}

// Create — owner, admin, developer only. Blocked when environment is locked.
func (s *Service) Create(projectID, envID, key, value, actorID string) (*VariableResponse, error) {
	if err := s.canEdit(projectID, actorID); err != nil {
		return nil, err
	}
	env, err := s.envSvc.GetByID(projectID, envID, actorID)
	if err != nil {
		return nil, err
	}
	if env.Locked {
		return nil, errors.New("environment is locked: unlock it before making changes")
	}
	_ = env
	encrypted, err := s.crypto.Encrypt(value)
	if err != nil {
		return nil, errors.New("encryption failed")
	}
	v := &models.Variable{EnvironmentID: envID, Key: key, Value: encrypted}
	if err := s.repo.Create(v); err != nil {
		return nil, fmt.Errorf("variable %q already exists in this environment", key)
	}
	s.saveVersion(v.ID, envID, key, encrypted, "created", actorID)
	return &VariableResponse{ID: v.ID, EnvironmentID: envID, Key: key, Value: "***", CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt}, nil
}

// Update — owner, admin, developer only. Blocked when environment is locked.
func (s *Service) Update(projectID, envID, varID, value, actorID string) (*VariableResponse, error) {
	if err := s.canEdit(projectID, actorID); err != nil {
		return nil, err
	}
	env, err := s.envSvc.GetByID(projectID, envID, actorID)
	if err != nil {
		return nil, err
	}
	if env.Locked {
		return nil, errors.New("environment is locked: unlock it before making changes")
	}
	v, err := s.repo.FindByID(varID)
	if err != nil || v.EnvironmentID != envID {
		return nil, errors.New("variable not found")
	}
	encrypted, err := s.crypto.Encrypt(value)
	if err != nil {
		return nil, errors.New("encryption failed")
	}
	v.Value = encrypted
	if err := s.repo.Update(v); err != nil {
		return nil, err
	}
	s.saveVersion(v.ID, envID, v.Key, encrypted, "updated", actorID)
	return &VariableResponse{ID: v.ID, EnvironmentID: envID, Key: v.Key, Value: "***", CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt}, nil
}

// Delete — owner, admin only. Blocked when environment is locked.
func (s *Service) Delete(projectID, envID, varID, actorID string) error {
	if err := s.canDelete(projectID, actorID); err != nil {
		return err
	}
	env, err := s.envSvc.GetByID(projectID, envID, actorID)
	if err != nil {
		return err
	}
	if env.Locked {
		return errors.New("environment is locked: unlock it before making changes")
	}
	v, err := s.repo.FindByID(varID)
	if err != nil || v.EnvironmentID != envID {
		return errors.New("variable not found")
	}
	s.saveVersion(v.ID, envID, v.Key, v.Value, "deleted", actorID)
	return s.repo.Delete(varID)
}

// Export — all members can pull (view decrypted values).
func (s *Service) Export(projectID, envID, userID string) (string, error) {
	if _, err := s.envSvc.GetByID(projectID, envID, userID); err != nil {
		return "", err
	}
	vars, err := s.repo.FindByEnvironment(envID)
	if err != nil {
		return "", err
	}
	lines := make([]string, 0, len(vars))
	for _, v := range vars {
		decrypted, err := s.crypto.Decrypt(v.Value)
		if err != nil {
			return "", fmt.Errorf("failed to decrypt %s", v.Key)
		}
		lines = append(lines, fmt.Sprintf("%s=%s", v.Key, decrypted))
	}
	return strings.Join(lines, "\n"), nil
}

// Import — owner, admin, developer only. Blocked when environment is locked.
func (s *Service) Import(projectID, envID, content, actorID string) (int, error) {
	if err := s.canEdit(projectID, actorID); err != nil {
		return 0, err
	}
	env, err := s.envSvc.GetByID(projectID, envID, actorID)
	if err != nil {
		return 0, err
	}
	if env.Locked {
		return 0, errors.New("environment is locked: unlock it before making changes")
	}
	count := 0
	for _, line := range strings.Split(strings.TrimSpace(content), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key, value := strings.TrimSpace(parts[0]), parts[1]
		encrypted, err := s.crypto.Encrypt(value)
		if err != nil {
			continue
		}
		existing, err := s.repo.FindByKey(envID, key)
		if err != nil {
			v := &models.Variable{EnvironmentID: envID, Key: key, Value: encrypted}
			if s.repo.Create(v) == nil {
				s.saveVersion(v.ID, envID, key, encrypted, "created", actorID)
				count++
			}
		} else {
			existing.Value = encrypted
			if s.repo.Update(existing) == nil {
				s.saveVersion(existing.ID, envID, key, encrypted, "updated", actorID)
				count++
			}
		}
	}
	return count, nil
}

// Diff — all members can compare.
type DiffEntry struct {
	Key    string `json:"key"`
	Status string `json:"status"`
}

func (s *Service) Diff(projectID, envAID, envBID, userID string) ([]DiffEntry, error) {
	if _, err := s.envSvc.GetByID(projectID, envAID, userID); err != nil {
		return nil, errors.New("source environment not found")
	}
	if _, err := s.envSvc.GetByID(projectID, envBID, userID); err != nil {
		return nil, errors.New("target environment not found")
	}
	varsA, _ := s.repo.FindByEnvironment(envAID)
	varsB, _ := s.repo.FindByEnvironment(envBID)
	mapA, mapB := make(map[string]string), make(map[string]string)
	for _, v := range varsA {
		if d, err := s.crypto.Decrypt(v.Value); err == nil {
			mapA[v.Key] = d
		}
	}
	for _, v := range varsB {
		if d, err := s.crypto.Decrypt(v.Value); err == nil {
			mapB[v.Key] = d
		}
	}
	seen := make(map[string]bool)
	var diff []DiffEntry
	for key, valA := range mapA {
		seen[key] = true
		if valB, ok := mapB[key]; !ok {
			diff = append(diff, DiffEntry{Key: key, Status: "missing_in_b"})
		} else if valA != valB {
			diff = append(diff, DiffEntry{Key: key, Status: "changed"})
		} else {
			diff = append(diff, DiffEntry{Key: key, Status: "same"})
		}
	}
	for key := range mapB {
		if !seen[key] {
			diff = append(diff, DiffEntry{Key: key, Status: "missing_in_a"})
		}
	}
	return diff, nil
}

func (s *Service) saveVersion(varID, envID, key, encryptedValue, action, actorID string) {
	db.DB.Create(&models.VariableVersion{
		VariableID:    varID,
		EnvironmentID: envID,
		Key:           key,
		Value:         encryptedValue,
		Action:        action,
		ActorID:       actorID,
	})
}
