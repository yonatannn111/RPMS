package models

import (
	"time"
)

type Message struct {
	ID         string    `json:"id" db:"id"`
	SenderID   string    `json:"sender_id" db:"sender_id"`
	ReceiverID string    `json:"receiver_id" db:"receiver_id"`
	Content    string    `json:"content" db:"content"`
	IsRead     bool      `json:"is_read" db:"is_read"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`

	// Optional fields for response
	SenderName   string `json:"sender_name,omitempty"`
	ReceiverName string `json:"receiver_name,omitempty"`
}

type Contact struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Email       string   `json:"email"`
	Role        string   `json:"role"`
	Avatar      string   `json:"avatar"`
	UnreadCount int      `json:"unread_count"`
	LastMessage *Message `json:"last_message,omitempty"`
}
