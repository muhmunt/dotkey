package db

import (
	"dotkey/config"
	"dotkey/models"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Init(cfg *config.Config) {
	var err error
	DB, err = gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("failed to connect to database: ", err)
	}

	if err := DB.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.ProjectMember{},
		&models.Environment{},
		&models.Variable{},
		&models.VariableVersion{},
		&models.DeviceCode{},
		&models.ProjectToken{},
		&models.RevokedToken{},
		&models.PasswordResetToken{},
		&models.Webhook{},
	); err != nil {
		log.Fatal("migration failed: ", err)
	}

	log.Println("database connected and migrated")
}
