// Package audit provides fire-and-forget security event logging.
package audit

import (
	"dotkey/db"
	"dotkey/models"
	"time"
)

// Log writes a security event asynchronously. Never blocks the caller.
func Log(userID, action, ip, detail string) {
	go func() {
		db.DB.Create(&models.AuditLog{
			UserID:    userID,
			Action:    action,
			IP:        ip,
			Detail:    detail,
			CreatedAt: time.Now(),
		})
	}()
}
