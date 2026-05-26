package webhook

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"dotkey/db"
	"dotkey/models"
	"dotkey/pkg/crypto"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type ProjectAccess interface {
	GetMemberRole(projectID, userID string) (string, error)
}

type Service struct {
	repo    *Repository
	projSvc ProjectAccess
	crypto  *crypto.Crypto
}

func NewService(repo *Repository, projSvc ProjectAccess, c *crypto.Crypto) *Service {
	return &Service{repo: repo, projSvc: projSvc, crypto: c}
}

type WebhookResponse struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"project_id"`
	URL       string    `json:"url"`
	Events    []string  `json:"events"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
	Secret    string    `json:"secret,omitempty"` // returned once at creation only
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

func (s *Service) Create(projectID, userID, rawURL string, events []string) (*WebhookResponse, error) {
	role, err := s.projSvc.GetMemberRole(projectID, userID)
	if err != nil {
		return nil, errors.New("project not found")
	}
	if role != "owner" && role != "admin" {
		return nil, errors.New("insufficient permissions")
	}
	if err := validateWebhookURL(rawURL); err != nil {
		return nil, err
	}

	secretBytes := make([]byte, 24)
	rand.Read(secretBytes) //nolint:errcheck
	plainSecret := hex.EncodeToString(secretBytes)

	encryptedSecret, err := s.crypto.Encrypt(plainSecret)
	if err != nil {
		return nil, errors.New("failed to secure webhook secret")
	}

	w := &models.Webhook{
		ProjectID: projectID,
		URL:       rawURL,
		Secret:    encryptedSecret,
		Events:    strings.Join(events, ","),
		Active:    true,
	}
	if err := s.repo.Create(w); err != nil {
		return nil, err
	}
	r := toResponse(*w)
	// return the plaintext secret once so the user can save it
	r.Secret = plainSecret
	return &r, nil
}

func (s *Service) Deliveries(projectID, webhookID, userID string) ([]models.WebhookDelivery, error) {
	if _, err := s.projSvc.GetMemberRole(projectID, userID); err != nil {
		return nil, errors.New("project not found")
	}
	var deliveries []models.WebhookDelivery
	err := db.DB.Where("webhook_id = ?", webhookID).
		Order("delivered_at desc").
		Limit(25).
		Find(&deliveries).Error
	return deliveries, err
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
		plainSecret, err := s.crypto.Decrypt(h.Secret)
		if err != nil {
			continue // skip hooks with corrupted/legacy secrets
		}
		go deliverOne(h.ID, h.URL, plainSecret, event, body)
	}
}

func deliverOne(webhookID, targetURL, plainSecret, event string, body []byte) {
	mac := hmac.New(sha256.New, []byte(plainSecret))
	mac.Write(body)
	sig := fmt.Sprintf("sha256=%s", hex.EncodeToString(mac.Sum(nil)))

	req, err := http.NewRequest(http.MethodPost, targetURL, bytes.NewReader(body))
	if err != nil {
		recordDelivery(webhookID, event, 0, err.Error())
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Dotkey-Signature", sig)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		recordDelivery(webhookID, event, 0, err.Error())
		return
	}
	resp.Body.Close()
	recordDelivery(webhookID, event, resp.StatusCode, "")
}

func recordDelivery(webhookID, event string, status int, errMsg string) {
	db.DB.Create(&models.WebhookDelivery{
		WebhookID:      webhookID,
		Event:          event,
		ResponseStatus: status,
		Error:          errMsg,
		DeliveredAt:    time.Now(),
	})
}

// validateWebhookURL rejects non-HTTP(S) schemes and private/loopback IP ranges (SSRF protection).
func validateWebhookURL(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return errors.New("invalid webhook URL")
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return errors.New("webhook URL must use http or https")
	}
	host := u.Hostname()
	ips, err := net.LookupHost(host)
	if err != nil {
		// allow if DNS fails at validation time — block at delivery if needed
		return nil
	}
	for _, ipStr := range ips {
		ip := net.ParseIP(ipStr)
		if ip == nil {
			continue
		}
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() {
			return errors.New("webhook URL must point to a public endpoint, not a private/loopback address")
		}
	}
	return nil
}
