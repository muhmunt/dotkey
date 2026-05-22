package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Environment struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ProjectID string    `gorm:"type:varchar(36);not null;index" json:"project_id"`
	Name      string    `gorm:"not null" json:"name"`
	Locked    bool      `gorm:"default:false" json:"locked"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (e *Environment) BeforeCreate(_ *gorm.DB) error {
	e.ID = uuid.New().String()
	return nil
}
