package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditLog struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID    string    `gorm:"index;type:varchar(36)" json:"user_id"`
	Action    string    `gorm:"not null" json:"action"`
	IP        string    `json:"ip,omitempty"`
	Detail    string    `json:"detail,omitempty"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

func (a *AuditLog) BeforeCreate(_ *gorm.DB) error {
	a.ID = uuid.New().String()
	return nil
}
