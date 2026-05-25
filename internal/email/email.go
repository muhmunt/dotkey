package email

import (
	"dotkey/config"
	"fmt"
	"net/smtp"
	"strings"
)

type Sender struct {
	cfg *config.Config
}

func New(cfg *config.Config) *Sender {
	return &Sender{cfg: cfg}
}

func (s *Sender) Enabled() bool {
	return s.cfg.SMTPHost != ""
}

func (s *Sender) SendPasswordReset(toEmail, resetURL string) error {
	if !s.Enabled() {
		return fmt.Errorf("email sending is not configured on this instance")
	}

	subject := "Reset your dotkey password"
	body := strings.Join([]string{
		"You requested a password reset for your dotkey account.",
		"",
		"Click the link below to set a new password. The link expires in 1 hour.",
		"",
		resetURL,
		"",
		"If you did not request this, you can safely ignore this email.",
	}, "\n")

	return s.send(toEmail, subject, body)
}

func (s *Sender) send(to, subject, body string) error {
	addr := s.cfg.SMTPHost + ":" + s.cfg.SMTPPort
	msg := "From: " + s.cfg.SMTPFrom + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n" +
		"\r\n" + body

	var auth smtp.Auth
	if s.cfg.SMTPUser != "" {
		auth = smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)
	}

	return smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{to}, []byte(msg))
}
