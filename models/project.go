package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Project struct {
	ID          string          `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name        string          `gorm:"not null" json:"name"`
	Description string          `json:"description"`
	OwnerID     string          `gorm:"type:varchar(36);not null;index" json:"owner_id"`
	Owner       *User           `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Members     []ProjectMember `gorm:"foreignKey:ProjectID" json:"members,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

func (p *Project) BeforeCreate(_ *gorm.DB) error {
	p.ID = uuid.New().String()
	return nil
}

type ProjectMember struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ProjectID string    `gorm:"type:varchar(36);not null;uniqueIndex:idx_project_user" json:"project_id"`
	UserID    string    `gorm:"type:varchar(36);not null;uniqueIndex:idx_project_user" json:"user_id"`
	User      *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Role      string    `gorm:"not null;default:'developer'" json:"role"` // owner, admin, developer, readonly
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (m *ProjectMember) BeforeCreate(_ *gorm.DB) error {
	m.ID = uuid.New().String()
	return nil
}
