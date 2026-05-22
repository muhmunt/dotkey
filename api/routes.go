package api

import (
	"dotkey/internal/activity"
	"dotkey/internal/auth"
	"dotkey/internal/environment"
	"dotkey/internal/project"
	"dotkey/internal/search"
	"dotkey/internal/token"
	"dotkey/internal/user"
	"dotkey/internal/variable"
	"dotkey/internal/version"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Router struct {
	authSvc   *auth.Service
	authH     *auth.Handler
	projectH  *project.Handler
	envH      *environment.Handler
	variableH *variable.Handler
	versionH  *version.Handler
	tokenH    *token.Handler
	activityH *activity.Handler
}

func NewRouter(
	authSvc *auth.Service,
	authH *auth.Handler,
	projectH *project.Handler,
	envH *environment.Handler,
	variableH *variable.Handler,
	versionH *version.Handler,
	tokenH *token.Handler,
	activityH *activity.Handler,
) *Router {
	return &Router{
		authSvc: authSvc, authH: authH,
		projectH: projectH, envH: envH,
		variableH: variableH, versionH: versionH,
		tokenH: tokenH, activityH: activityH,
	}
}

func (r *Router) Setup(engine *gin.Engine) {
	engine.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	v1 := engine.Group("/api/v1")

	// public
	authGroup := v1.Group("/auth")
	{
		authGroup.POST("/register", r.authH.Register)
		authGroup.POST("/login", r.authH.Login)
		authGroup.POST("/login/2fa", r.authH.Login2FA)
		authGroup.POST("/device", r.authH.DeviceCode)
		authGroup.GET("/device/poll", r.authH.DevicePoll)
	}

	// authenticated
	protected := v1.Group("/", r.authSvc.Middleware())
	{
		protected.GET("/auth/me", r.authH.Me)
		protected.POST("/auth/device/activate", r.authH.DeviceActivate)
		protected.POST("/auth/2fa/setup", r.authH.Setup2FA)
		protected.POST("/auth/2fa/confirm", r.authH.Confirm2FA)
		protected.DELETE("/auth/2fa", r.authH.Disable2FA)
		protected.POST("/auth/reveal/unlock", r.authH.RevealUnlock)

		protected.GET("/users/search", user.Search)
		protected.GET("/search", search.Search) // global search

		projects := protected.Group("/projects")
		{
			projects.GET("", r.projectH.List)
			projects.POST("", r.projectH.Create)
			projects.GET("/:id", r.projectH.Get)
			projects.PUT("/:id", r.projectH.Update)
			projects.DELETE("/:id", r.projectH.Delete)

			projects.GET("/:id/members", r.projectH.ListMembers)
			projects.POST("/:id/members", r.projectH.AddMember)
			projects.PUT("/:id/members/:uid", r.projectH.UpdateMemberRole)
			projects.DELETE("/:id/members/:uid", r.projectH.RemoveMember)

			projects.GET("/:id/environments", r.envH.List)
			projects.POST("/:id/environments", r.envH.Create)
			projects.PUT("/:id/environments/:eid", r.envH.Rename)
			projects.PATCH("/:id/environments/:eid/lock", r.envH.Lock)
			projects.DELETE("/:id/environments/:eid", r.envH.Delete)

			projects.GET("/:id/diff", r.variableH.Diff)
			projects.GET("/:id/activity", r.activityH.List) // activity feed
			projects.GET("/:id/tokens", r.tokenH.List)       // CI/CD tokens
			projects.POST("/:id/tokens", r.tokenH.Create)
			projects.DELETE("/:id/tokens/:tid", r.tokenH.Revoke)

			envVars := projects.Group("/:id/environments/:eid")
			{
				envVars.GET("/variables", r.variableH.List)
				envVars.POST("/variables", r.variableH.Create)
				envVars.PUT("/variables/:vid", r.variableH.Update)
				envVars.DELETE("/variables/:vid", r.variableH.Delete)

				envVars.GET("/export", r.authSvc.RevealMiddleware(), r.variableH.Export)
				envVars.POST("/import", r.variableH.Import)

				envVars.GET("/history", r.versionH.History)
				envVars.POST("/rollback/:vid", r.versionH.Rollback)
			}
		}
	}
}
