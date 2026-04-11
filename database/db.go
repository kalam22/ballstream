package database

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var DB *sql.DB

// GetJWTSecret returns the JWT secret from environment
func GetJWTSecret() string {
	return os.Getenv("JWT_SECRET")
}

func InitDB() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Println("[DB] No DATABASE_URL provided. Database functionality disabled.")
		return
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("[DB] Failed to open db connection: %v", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatalf("[DB] Failed to connect to db: %v", err)
	}
	
	DB = db
	log.Println("[DB] Connected to PostgreSQL successfully.")

	createTables()
	seedAdmin()
}

func createTables() {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		role VARCHAR(50) DEFAULT 'admin',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
	`
	if _, err := DB.Exec(query); err != nil {
		log.Fatalf("[DB] Failed to create users table: %v", err)
	}
}

func seedAdmin() {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		log.Printf("[DB] Error checking users count: %v", err)
		return
	}

	if count == 0 {
		adminEmail := os.Getenv("ADMIN_EMAIL")
		adminPassword := os.Getenv("ADMIN_PASSWORD")

		if adminEmail == "" || adminPassword == "" {
			log.Println("[DB] Empty ADMIN_EMAIL or ADMIN_PASSWORD, skipping seed.")
			return
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("[DB] Failed to hash password: %v", err)
			return
		}

		_, err = DB.Exec("INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)", adminEmail, string(hash), "admin")
		if err != nil {
			log.Printf("[DB] Failed to seed admin user: %v", err)
			return
		}

		log.Println("[DB] Successfully seeded initial admin user.")
	}
}
