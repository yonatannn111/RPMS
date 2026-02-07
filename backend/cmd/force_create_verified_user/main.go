package main

import (
	"fmt"
	"log"
	"os"
	"rpms-backend/internal/config"
	"rpms-backend/internal/supabase"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: go run main.go <email> <password> [name]")
		os.Exit(1)
	}

	email := os.Args[1]
	password := os.Args[2]
	name := "Verified User"
	if len(os.Args) > 3 {
		name = os.Args[3]
	}

	// Load config (assumes .env is in ../../../)
	os.Chdir("../../..") // unexpected, but needed if running from cmd subdir without proper env loading context
    // Actually better to just load from current if possible or hardcode for this script
    // but let's try to use the config loader
	cfg := config.New()

    if cfg.Supabase.ServiceRoleKey == "" {
        fmt.Println("Error: SUPABASE_SERVICE_ROLE_KEY is not set in environment.")
        fmt.Println("Please run this with the env vars set, e.g.:")
        fmt.Println("export SUPABASE_SERVICE_ROLE_KEY=... && go run main.go ...")
        os.Exit(1)
    }

	client := supabase.NewClient(cfg)

	fmt.Printf("Creating verified user: %s\n", email)

	metadata := map[string]interface{}{
		"name": name,
		"role": "author", // Default role
	}

	user, err := client.AdminCreateUser(email, password, metadata)
	if err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}

	fmt.Printf("✅ User created successfully!\nID: %s\nEmail: %s\nEmail Confirmed: %v\n", user.ID, user.Email, true)
    fmt.Println("\nYou can now log in with this account immediately.")
}
