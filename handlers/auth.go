package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
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

	jwtSecret := os.Getenv("JWT_SECRET")

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   req.Email,
		"role":  role,
		"iss":   "kana.stream",
		"ext":   time.Now().Add(2 * time.Hour).Unix(),
		"exp":   time.Now().Add(2 * time.Hour).Unix(),
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
