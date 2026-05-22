package ratelimit

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type bucket struct {
	mu        sync.Mutex
	attempts  []time.Time
}

var store sync.Map // key -> *bucket

// Login returns a middleware that limits to maxAttempts per window per IP.
func Login(maxAttempts int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := clientIP(c)

		val, _ := store.LoadOrStore(key, &bucket{})
		b := val.(*bucket)

		b.mu.Lock()
		now := time.Now()
		// prune attempts outside the window
		fresh := b.attempts[:0]
		for _, t := range b.attempts {
			if now.Sub(t) < window {
				fresh = append(fresh, t)
			}
		}
		b.attempts = fresh

		if len(b.attempts) >= maxAttempts {
			b.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many login attempts, please wait before trying again",
			})
			return
		}

		b.attempts = append(b.attempts, now)
		b.mu.Unlock()

		c.Next()
	}
}

func clientIP(c *gin.Context) string {
	if ip := c.GetHeader("X-Forwarded-For"); ip != "" {
		return strings.Split(ip, ",")[0]
	}
	return c.ClientIP()
}
