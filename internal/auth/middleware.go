package auth

import (
	"dotkey/db"
	"dotkey/internal/token"
	"dotkey/models"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func (s *Service) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")

		// project token path (dotkey_tok_...)
		if strings.HasPrefix(tokenStr, "dotkey_tok_") {
			hash := token.HashForLookup(tokenStr)
			var pt models.ProjectToken
			if err := db.DB.Where("token_hash = ?", hash).First(&pt).Error; err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
				return
			}

			var user models.User
			if err := db.DB.First(&user, "id = ?", pt.CreatedByID).Error; err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token owner not found"})
				return
			}

			// update last used async
			go func() {
				now := time.Now()
				db.DB.Model(&pt).Update("last_used_at", now)
			}()

			c.Set("user", &user)
			c.Set("user_id", user.ID)
			c.Set("is_token_auth", true)
			c.Set("token_project_id", pt.ProjectID)
			c.Set("token_permissions", pt.Permissions)
			c.Next()
			return
		}

		// JWT path
		claims, err := s.ValidateToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		var user models.User
		if err := db.DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			return
		}

		c.Set("user", &user)
		c.Set("user_id", user.ID)
		c.Next()
	}
}

func CurrentUser(c *gin.Context) *models.User {
	user, _ := c.Get("user")
	return user.(*models.User)
}
