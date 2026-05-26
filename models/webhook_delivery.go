package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WebhookDelivery struct {
	ID             string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	WebhookID      string    `gorm:"not null;index;type:varchar(36)" json:"webhook_id"`
	Event          string    `gorm:"not null" json:"event"`
	ResponseStatus int       `json:"response_status"` // 0 = network/timeout error
	Error          string    `json:"error,omitempty"`
	DeliveredAt    time.Time `gorm:"index" json:"delivered_at"`
}

func (d *WebhookDelivery) BeforeCreate(_ *gorm.DB) error {
	d.ID = uuid.New().String()
	return nil
}
