package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProjectToken struct {
	ID          string     `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ProjectID   string     `gorm:"type:varchar(36);not null;index" json:"project_id"`
	Name        string     `gorm:"not null" json:"name"`
	TokenHash   string     `gorm:"not null;uniqueIndex" json:"-"` // sha256 hex — never exposed
	TokenPrefix string     `gorm:"not null" json:"token_prefix"`  // first 16 chars, shown in UI
	Permissions string     `gorm:"not null;default:'read'" json:"permissions"` // "read" or "read_write"
	CreatedByID string     `gorm:"type:varchar(36);not null" json:"created_by_id"`
	LastUsedAt  *time.Time `json:"last_used_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (t *ProjectToken) BeforeCreate(_ *gorm.DB) error {
	t.ID = uuid.New().String()
	return nil
}
