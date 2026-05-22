package main

import (
	"dotkey/api"
	"dotkey/config"
	"dotkey/db"
	"dotkey/internal/activity"
	"dotkey/internal/auth"
	"dotkey/internal/environment"
	"dotkey/internal/project"
	"dotkey/internal/ratelimit"
	tkn "dotkey/internal/token"
	"dotkey/internal/variable"
	"dotkey/internal/version"
	"dotkey/models"
	"dotkey/pkg/crypto"
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()
	db.Init(cfg)

	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			db.DB.Where("expires_at < ?", time.Now()).Delete(&models.DeviceCode{})
		}
	}()

	cryptoSvc := crypto.New(cfg.EncryptionKey)

	projectRepo := project.NewRepository()
	envRepo := environment.NewRepository()
	varRepo := variable.NewRepository()
	versionRepo := version.NewRepository()
	tokenRepo := tkn.NewRepository()
	activityRepo := activity.NewRepository()

	authSvc := auth.NewService(cfg, cryptoSvc)
	projectSvc := project.NewService(projectRepo)
	envSvc := environment.NewService(envRepo, projectSvc)
	varSvc := variable.NewService(varRepo, envSvc, projectSvc, cryptoSvc)
	tokenSvc := tkn.NewService(tokenRepo, projectSvc)

	authH := auth.NewHandler(authSvc)
	projectH := project.NewHandler(projectSvc)
	envH := environment.NewHandler(envSvc)
	varH := variable.NewHandler(varSvc)
	versionH := version.NewHandler(versionRepo, envSvc)
	tokenH := tkn.NewHandler(tokenSvc)
	activityH := activity.NewHandler(activityRepo, projectSvc)

	engine := gin.Default()

	allowedOrigins := buildOriginSet(cfg.AllowedOrigins)
	engine.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if _, ok := allowedOrigins[origin]; ok {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Reveal-Token")
		c.Header("Vary", "Origin")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	engine.Use(func(c *gin.Context) {
		if c.Request.URL.Path == "/api/v1/auth/login" && c.Request.Method == "POST" {
			ratelimit.Login(10, time.Minute)(c)
			return
		}
		c.Next()
	})

	router := api.NewRouter(authSvc, authH, projectH, envH, varH, versionH, tokenH, activityH)
	router.Setup(engine)

	log.Printf("EnvX API running on :%s (origins: %s)", cfg.Port, cfg.AllowedOrigins)
	if err := engine.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}

func buildOriginSet(csv string) map[string]struct{} {
	set := make(map[string]struct{})
	for _, o := range strings.Split(csv, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			set[o] = struct{}{}
		}
	}
	return set
}
