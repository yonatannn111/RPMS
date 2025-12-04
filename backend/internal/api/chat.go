package api

import (
	"net/http"
	"time"

	"rpms-backend/internal/database"
	"rpms-backend/internal/models"

	"fmt"
	"os"

	"github.com/gin-gonic/gin"
)

func logDebug(format string, a ...interface{}) {
	f, err := os.OpenFile("debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	msg := fmt.Sprintf(format, a...)
	f.WriteString(time.Now().Format(time.RFC3339) + " " + msg + "\n")
}

type ChatHandler struct {
	db *database.Database
}

func NewChatHandler(db *database.Database) *ChatHandler {
	return &ChatHandler{db: db}
}

// SendMessage handles sending a new message
func (h *ChatHandler) SendMessage(c *gin.Context) {
	var req struct {
		ReceiverID string `json:"receiver_id" binding:"required"`
		Content    string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	senderID := c.GetString("userID")

	// TODO: Verify if sender is allowed to chat with receiver based on roles
	// For now, we'll assume the frontend filters contacts correctly,
	// but in a production app we should enforce this on backend too.

	query := `
		INSERT INTO messages (sender_id, receiver_id, content, created_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, sender_id, receiver_id, content, is_read, created_at
	`

	var msg models.Message
	err := h.db.QueryRow(
		c.Request.Context(),
		query,
		senderID,
		req.ReceiverID,
		req.Content,
		time.Now(),
	).Scan(&msg.ID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.IsRead, &msg.CreatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	c.JSON(http.StatusCreated, msg)
}

// GetMessages retrieves messages between current user and another user
func (h *ChatHandler) GetMessages(c *gin.Context) {
	contactID := c.Query("contact_id")
	if contactID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "contact_id is required"})
		return
	}

	userID := c.GetString("userID")

	// Mark messages as read
	updateQuery := `
		UPDATE messages 
		SET is_read = TRUE 
		WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE
	`
	_, _ = h.db.Exec(c.Request.Context(), updateQuery, contactID, userID)

	// Fetch messages
	query := `
		SELECT id, sender_id, receiver_id, content, is_read, created_at
		FROM messages
		WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
		ORDER BY created_at ASC
	`

	rows, err := h.db.Query(c.Request.Context(), query, userID, contactID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var msg models.Message
		if err := rows.Scan(&msg.ID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.IsRead, &msg.CreatedAt); err != nil {
			continue
		}
		messages = append(messages, msg)
	}

	if messages == nil {
		messages = []models.Message{}
	}
	c.JSON(http.StatusOK, messages)
}

// GetContacts retrieves list of users the current user can chat with
func (h *ChatHandler) GetContacts(c *gin.Context) {
	userID := c.GetString("userID")
	userRole := c.GetString("userRole")

	logDebug("GetContacts called. UserID: %s, Role: %s", userID, userRole)

	var roleFilter string

	// Define allowed roles based on current user role
	switch userRole {
	case "author":
		// Author can chat with Editor and Coordinator
		roleFilter = "('editor', 'coordinator')"
	case "editor":
		// Editor can chat with Author, Coordinator, and Admin
		roleFilter = "('author', 'coordinator', 'admin')"
	case "coordinator":
		// Coordinator can chat with Author, Editor, and Admin
		roleFilter = "('author', 'editor', 'admin')"
	case "admin":
		// Admin can chat with Editor and Coordinator
		roleFilter = "('editor', 'coordinator')"
	default:
		logDebug("Invalid role: %s", userRole)
		c.JSON(http.StatusOK, []models.Contact{})
		return
	}

	logDebug("Role filter: %s", roleFilter)

	query := `
		SELECT id, name, email, role, avatar
		FROM users
		WHERE role IN ` + roleFilter + ` AND id != $1
		ORDER BY name ASC
	`

	rows, err := h.db.Query(c.Request.Context(), query, userID)
	if err != nil {
		logDebug("Query failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch contacts"})
		return
	}
	defer rows.Close()

	var contacts []models.Contact
	for rows.Next() {
		var contact models.Contact
		if err := rows.Scan(&contact.ID, &contact.Name, &contact.Email, &contact.Role, &contact.Avatar); err != nil {
			logDebug("Scan failed: %v", err)
			continue
		}

		// Get unread count for this contact
		var unreadCount int
		_ = h.db.QueryRow(
			c.Request.Context(),
			"SELECT COUNT(*) FROM messages WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE",
			contact.ID, userID,
		).Scan(&unreadCount)
		contact.UnreadCount = unreadCount

		// Get last message
		var lastMsg models.Message
		err = h.db.QueryRow(
			c.Request.Context(),
			"SELECT content, created_at FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at DESC LIMIT 1",
			contact.ID, userID,
		).Scan(&lastMsg.Content, &lastMsg.CreatedAt)

		if err == nil {
			contact.LastMessage = &lastMsg
		}

		contacts = append(contacts, contact)
	}

	if contacts == nil {
		contacts = []models.Contact{}
	}
	logDebug("Returning %d contacts", len(contacts))
	c.JSON(http.StatusOK, contacts)
}
