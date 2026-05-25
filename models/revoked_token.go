package models

import "time"

// RevokedToken is a JWT blocklist entry. Only JWTs are tracked here;
// project tokens are revoked by deleting their DB row.
type RevokedToken struct {
	JTI       string    `gorm:"primaryKey;type:varchar(36)" json:"-"`
	ExpiresAt time.Time `gorm:"index" json:"-"`
}
