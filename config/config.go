package config

import "os"

type Config struct {
	DatabaseURL    string
	JWTSecret      string
	EncryptionKey  string
	Port           string
	AllowedOrigins string // comma-separated, e.g. "http://localhost:3000,https://app.envx.io"
}

func Load() *Config {
	return &Config{
		DatabaseURL:    mustEnv("DATABASE_URL"),
		JWTSecret:      mustEnv("JWT_SECRET"),
		EncryptionKey:  mustEnv("ENCRYPTION_KEY"),
		Port:           getEnv("PORT", "8080"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:3000"),
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
