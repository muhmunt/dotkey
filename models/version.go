package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type VariableVersion struct {
	ID            string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	EnvironmentID string    `gorm:"type:varchar(36);not null;index" json:"environment_id"`
	VariableID    string    `gorm:"type:varchar(36);not null;index" json:"variable_id"`
	Key           string    `gorm:"not null" json:"key"`
	Value         string    `gorm:"not null" json:"-"` // encrypted snapshot
	Action        string    `gorm:"not null" json:"action"` // created, updated, deleted, rolled_back
	ActorID       string    `gorm:"type:varchar(36);not null" json:"actor_id"`
	Actor         *User     `gorm:"foreignKey:ActorID" json:"actor,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

func (v *VariableVersion) BeforeCreate(_ *gorm.DB) error {
	v.ID = uuid.New().String()
	return nil
}
