package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"football-stream/database"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type User struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

// HandleLogin processes authentication and returns a JWT token.
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method must be POST")
		return
	}

	if database.DB == nil {
		WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Database not configured")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON body")
		return
	}



	var id int
	var hash, role string
	err := database.DB.QueryRow("SELECT id, password_hash, role FROM users WHERE email = $1", req.Email).Scan(&id, &hash, &role)
	
	if err != nil {
		if err == sql.ErrNoRows {
			WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid email or password")
			return
		}
		log.Printf("[Auth] DB error during login: %v", err)
		WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid email or password")
		return
	}

	// Generate a unique Session ID to enforce 1-device policy
	sessionID := GenerateRequestID()
	
	// Check if user already has an active session (another device is logged in)
	var existingSessionID string
	checkErr := database.DB.QueryRow("SELECT COALESCE(session_id, '') FROM users WHERE email = $1", req.Email).Scan(&existingSessionID)
	if checkErr == nil && existingSessionID != "" {
		// Active session exists — reject the new login
		WriteError(w, http.StatusConflict, "ALREADY_LOGGED_IN", "Akun ini sudah login di perangkat lain. Silakan logout terlebih dahulu.")
		return
	}
	
	// Extract device info from User-Agent
	device := r.UserAgent()
	if device == "" {
		device = "Unknown Device"
	}

	// Store new session and device in database
	_, err = database.DB.Exec("UPDATE users SET session_id = $1, device = $2 WHERE email = $3", sessionID, device, req.Email)
	if err != nil {
		log.Printf("[Auth] Failed to update session_id and device: %v", err)
	}

	jwtSecret := os.Getenv("JWT_SECRET")

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   req.Email,
		"role":  role,
		"iss":   "kana.stream",
		"session_id": sessionID,
		"ext":   time.Now().Add(3 * time.Hour).Unix(),
		"exp":   time.Now().Add(3 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	})

	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate token")
		return
	}

	WriteSuccess(w, LoginResponse{
		Token: tokenString,
		User: User{
			Email: req.Email,
			Role:  role,
		},
	})
}

// HandleVerifySession validates the current JWT session is still active.
// Returns 200 if valid, 401 SESSION_INVALIDATED if another device logged in.
func HandleVerifySession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method must be GET")
		return
	}

	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing token")
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(database.GetJWTSecret()), nil
	})

	if err != nil || !token.Valid {
		WriteError(w, http.StatusUnauthorized, "TOKEN_EXPIRED", "Token expired or invalid")
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid token claims")
		return
	}

	email, _ := claims["sub"].(string)
	sessionID, _ := claims["session_id"].(string)

	if email == "" || sessionID == "" || database.DB == nil {
		WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid session")
		return
	}

	var dbSessionID string
	dbErr := database.DB.QueryRow("SELECT session_id FROM users WHERE email = $1", email).Scan(&dbSessionID)
	if dbErr != nil || dbSessionID != sessionID {
		// Another device has logged in - this session is no longer valid
		WriteError(w, http.StatusUnauthorized, "SESSION_INVALIDATED", "Session was invalidated by another login")
		return
	}

	WriteSuccess(w, map[string]string{"status": "valid", "email": email})
}

// HandleLogout clears the session_id from the database, effectively logging the user out
// and allowing them to login again from any device.
func HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method must be POST")
		return
	}

	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		// Even without token, return success (client-side logout is enough)
		WriteSuccess(w, map[string]string{"status": "logged_out"})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	token, _ := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(database.GetJWTSecret()), nil
	})

	// Even if err != nil (like TokenExpiredError), token.Claims will be populated if signature was valid
	if token != nil {
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if email, _ := claims["sub"].(string); email != "" && database.DB != nil {
				// Clear session_id and device from DB so next login from any device is allowed
				_, dbErr := database.DB.Exec("UPDATE users SET session_id = NULL, device = NULL WHERE email = $1", email)
				if dbErr != nil {
					log.Printf("[Auth] Failed to clear session_id and device on logout for %s: %v", email, dbErr)
				} else {
					log.Printf("[Auth] Session and device cleared for %s", email)
				}
			}
		}
	}

	WriteSuccess(w, map[string]string{"status": "logged_out"})
}
