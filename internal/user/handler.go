package user

import (
	"dotkey/db"
	"dotkey/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Search finds a user by email — used by the dashboard invite form.
func Search(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email query parameter is required"})
		return
	}

	var user models.User
	if err := db.DB.Where("email = ?", email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no user found with that email"})
		return
	}

	// return only safe fields — never expose password hash
	c.JSON(http.StatusOK, gin.H{
		"id":    user.ID,
		"name":  user.Name,
		"email": user.Email,
	})
}
