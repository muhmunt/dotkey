package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Webhook struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ProjectID string    `gorm:"not null;index;type:varchar(36)" json:"project_id"`
	URL       string    `gorm:"not null" json:"url"`
	Secret    string    `gorm:"not null" json:"-"`
	Events    string    `gorm:"not null" json:"events"` // comma-separated
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
}

func (w *Webhook) BeforeCreate(_ *gorm.DB) error {
	w.ID = uuid.New().String()
	return nil
}
