package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DeviceCode struct {
	ID         string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	DeviceCode string    `gorm:"uniqueIndex;not null" json:"device_code"`
	UserCode   string    `gorm:"uniqueIndex;not null" json:"user_code"`
	UserID     string    `gorm:"type:varchar(36)" json:"user_id,omitempty"` // set when approved
	Token      string    `json:"token,omitempty"`                            // set when approved
	ExpiresAt  time.Time `json:"expires_at"`
	CreatedAt  time.Time `json:"created_at"`
}

func (d *DeviceCode) BeforeCreate(_ *gorm.DB) error {
	d.ID = uuid.New().String()
	return nil
}
