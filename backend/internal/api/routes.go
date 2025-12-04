package api

import (
	"rpms-backend/internal/auth"
	"rpms-backend/internal/config"
	"rpms-backend/internal/database"
	"rpms-backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, db *database.Database, cfg *config.Config) {
	server := NewServer(db, cfg)
	chatHandler := NewChatHandler(db)
	jwtManager := auth.NewJWTManager(cfg)

	// CORS middleware
	router.Use(middleware.CORSSpecific(cfg.GetCORSOrigins()))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "rpms-backend",
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Auth routes (no authentication required)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", server.Register)
			auth.POST("/login", server.Login)
		}

		// Protected routes (authentication required)
		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware(jwtManager))
		{
			// User routes
			protected.GET("/profile", server.GetProfile)
			protected.PUT("/profile", server.UpdateProfile)
			protected.PUT("/auth/password", server.ChangePassword)
			protected.DELETE("/auth/account", server.DeleteAccount)

			// Paper routes
			papers := protected.Group("/papers")
			{
				papers.GET("", server.GetPapers)
				papers.POST("", middleware.AuthorOrAdmin(), server.CreatePaper)
				papers.PUT("/:id", middleware.AuthorOrAdmin(), server.UpdatePaper)
				papers.DELETE("/:id", middleware.AuthorOrAdmin(), server.DeletePaper)
			}

			// Review routes
			reviews := protected.Group("/reviews")
			{
				reviews.GET("", server.GetReviews)
				reviews.POST("", middleware.EditorOrAdmin(), server.CreateReview)
			}

			// Event routes
			events := protected.Group("/events")
			{
				events.GET("", server.GetEvents)
				events.POST("", middleware.CoordinatorOrAdmin(), server.CreateEvent)
				events.PUT("/:id", middleware.CoordinatorOrAdmin(), server.UpdateEvent)
				events.DELETE("/:id", middleware.CoordinatorOrAdmin(), server.DeleteEvent)
			}

			// Chat routes
			chat := protected.Group("/chat")
			{
				chat.POST("/send", chatHandler.SendMessage)
				chat.GET("/messages", chatHandler.GetMessages)
				chat.GET("/contacts", chatHandler.GetContacts)
			}

			// Admin only routes
			admin := protected.Group("/admin")
			admin.Use(middleware.AdminOnly())
			{
				// Additional admin-specific routes can be added here
				admin.GET("/stats", func(c *gin.Context) {
					// TODO: Implement admin statistics
					c.JSON(200, gin.H{"message": "Admin statistics endpoint"})
				})
			}
		}
	}
}
