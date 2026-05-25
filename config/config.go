package config

import "os"

type Config struct {
	DatabaseURL    string
	JWTSecret      string
	EncryptionKey  string
	Port           string
	AllowedOrigins string

	// SMTP — all optional; if SMTPHost is empty email sending is disabled
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
	AppURL       string // base URL for password-reset links, e.g. https://app.example.com
}

func Load() *Config {
	return &Config{
		DatabaseURL:    mustEnv("DATABASE_URL"),
		JWTSecret:      mustEnv("JWT_SECRET"),
		EncryptionKey:  mustEnv("ENCRYPTION_KEY"),
		Port:           getEnv("PORT", "8080"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:3000"),
		SMTPHost:       os.Getenv("SMTP_HOST"),
		SMTPPort:       getEnv("SMTP_PORT", "587"),
		SMTPUser:       os.Getenv("SMTP_USER"),
		SMTPPassword:   os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:       getEnv("SMTP_FROM", "noreply@dotkey.app"),
		AppURL:         getEnv("APP_URL", "http://localhost:3000"),
	}
}

func mustEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		panic("missing required env var: " + key)
	}
	return val
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
