package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BackupCode struct {
	ID        string     `gorm:"primaryKey;type:varchar(36)"`
	UserID    string     `gorm:"not null;index;type:varchar(36)"`
	CodeHash  string     `gorm:"not null"`
	UsedAt    *time.Time
	CreatedAt time.Time
}

func (b *BackupCode) BeforeCreate(_ *gorm.DB) error {
	b.ID = uuid.New().String()
	return nil
}
