package webhook

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"dotkey/models"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
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

type WebhookResponse struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"project_id"`
	URL       string    `json:"url"`
	Events    []string  `json:"events"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
}

func toResponse(w models.Webhook) WebhookResponse {
	events := strings.Split(w.Events, ",")
	return WebhookResponse{
		ID: w.ID, ProjectID: w.ProjectID, URL: w.URL,
		Events: events, Active: w.Active, CreatedAt: w.CreatedAt,
	}
}

func (s *Service) List(projectID, userID string) ([]WebhookResponse, error) {
	if _, err := s.projSvc.GetMemberRole(projectID, userID); err != nil {
		return nil, errors.New("project not found")
	}
	hooks, err := s.repo.FindByProject(projectID)
	if err != nil {
		return nil, err
	}
	out := make([]WebhookResponse, len(hooks))
	for i, h := range hooks {
		out[i] = toResponse(h)
	}
	return out, nil
}

func (s *Service) Create(projectID, userID, url string, events []string) (*WebhookResponse, error) {
	role, err := s.projSvc.GetMemberRole(projectID, userID)
	if err != nil {
		return nil, errors.New("project not found")
	}
	if role != "owner" && role != "admin" {
		return nil, errors.New("insufficient permissions")
	}
	secretBytes := make([]byte, 24)
	rand.Read(secretBytes) //nolint:errcheck
	secret := hex.EncodeToString(secretBytes)

	w := &models.Webhook{
		ProjectID: projectID,
		URL:       url,
		Secret:    secret,
		Events:    strings.Join(events, ","),
		Active:    true,
	}
	if err := s.repo.Create(w); err != nil {
		return nil, err
	}
	r := toResponse(*w)
	return &r, nil
}

func (s *Service) Delete(projectID, webhookID, userID string) error {
	role, err := s.projSvc.GetMemberRole(projectID, userID)
	if err != nil {
		return errors.New("project not found")
	}
	if role != "owner" && role != "admin" {
		return errors.New("insufficient permissions")
	}
	return s.repo.Delete(webhookID, projectID)
}

// Payload is sent to webhook URLs on variable events.
type Payload struct {
	Event           string    `json:"event"`
	ProjectID       string    `json:"project_id"`
	EnvironmentID   string    `json:"environment_id"`
	EnvironmentName string    `json:"environment_name"`
	Key             string    `json:"key"`
	Actor           string    `json:"actor"`
	Timestamp       time.Time `json:"timestamp"`
}

// Deliver fires all active webhooks for the project matching the event.
// Satisfies variable.WebhookDeliverer — called in a goroutine by the variable service.
func (s *Service) Deliver(projectID, envID, envName, key, event, actor string) {
	hooks, err := s.repo.FindActiveByProject(projectID)
	if err != nil || len(hooks) == 0 {
		return
	}
	p := Payload{
		Event:           event,
		ProjectID:       projectID,
		EnvironmentID:   envID,
		EnvironmentName: envName,
		Key:             key,
		Actor:           actor,
		Timestamp:       time.Now(),
	}
	body, _ := json.Marshal(p)
	for _, h := range hooks {
		if !strings.Contains(h.Events, event) {
			continue
		}
		go deliverOne(h.URL, h.Secret, body)
	}
}

func deliverOne(url, secret string, body []byte) {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	sig := fmt.Sprintf("sha256=%s", hex.EncodeToString(mac.Sum(nil)))

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Dotkey-Signature", sig)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err == nil {
		resp.Body.Close()
	}
}
