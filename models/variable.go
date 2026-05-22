package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Variable struct {
	ID            string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	EnvironmentID string    `gorm:"type:varchar(36);not null;index;uniqueIndex:idx_env_key" json:"environment_id"`
	Key           string    `gorm:"not null;uniqueIndex:idx_env_key" json:"key"`
	Value         string    `gorm:"not null" json:"-"` // always encrypted, never exposed raw
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (v *Variable) BeforeCreate(_ *gorm.DB) error {
	v.ID = uuid.New().String()
	return nil
}
