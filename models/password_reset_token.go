package models

import (
	"time"

	"gorm.io/gorm"
)

type PasswordResetToken struct {
	Token     string     `gorm:"primaryKey;type:varchar(64)" json:"-"`
	UserID    string     `gorm:"not null;index;type:varchar(36)" json:"-"`
	ExpiresAt time.Time  `gorm:"index" json:"-"`
	UsedAt    *time.Time `json:"-"`
}

func (p *PasswordResetToken) BeforeCreate(_ *gorm.DB) error { return nil }
