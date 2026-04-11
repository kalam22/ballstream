package handlers

import (
	"database/sql"
	"encoding/json"
	"football-stream/database"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type UserResponse struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type UpdateUserRequest struct {
	Email    *string `json:"email,omitempty"`
	Password *string `json:"password,omitempty"`
	Role     *string `json:"role,omitempty"`
}

// GetUsers returns all users (admin only)
func GetUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method must be GET")
		return
	}

	// Check if user is admin
	if !isAdmin(r) {
		WriteError(w, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, email, role, created_at
		FROM users
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Printf("[Users] Query error: %v", err)
		WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to fetch users")
		return
	}
	defer rows.Close()

	users := []UserResponse{}
	for rows.Next() {
		var user UserResponse
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Role,
			&user.CreatedAt,
		)
		if err != nil {
			log.Printf("[Users] Scan error: %v", err)
			continue
		}

		users = append(users, user)
	}

	WriteSuccess(w, users)
}

// GetUser returns a single user by ID (admin only)
func GetUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method must be GET")
		return
	}

	if !isAdmin(r) {
		WriteError(w, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	// Extract ID from path
	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/v1/users/")
	idStr = strings.TrimSuffix(idStr, "/")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "INVALID_ID", "Invalid user ID")
		return
	}

	var user UserResponse
	err = database.DB.QueryRow(`
		SELECT id, email, role, created_at
		FROM users
		WHERE id = $1
	`, id).Scan(
		&user.ID,
		&user.Email,
		&user.Role,
		&user.CreatedAt,
	)

	if err == sql.ErrNoRows {
		WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
		return
	}
	if err != nil {
		log.Printf("[Users] Query error: %v", err)
		WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to fetch user")
		return
	}

	WriteSuccess(w, user)
}

// CreateUser creates a new user (admin only)
func CreateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method must be POST")
		return
	}

	if !isAdmin(r) {
		WriteError(w, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON body")
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" {
		WriteError(w, http.StatusBadRequest, "INVALID_INPUT", "Email and password are required")
		return
	}

	if len(req.Password) < 8 {
		WriteError(w, http.StatusBadRequest, "WEAK_PASSWORD", "Password must be at least 8 characters")
		return
	}

	if req.Role == "" {
		req.Role = "user"
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "HASH_ERROR", "Failed to hash password")
		return
	}

	// Insert user
	var userID int
	err = database.DB.QueryRow(`
		INSERT INTO users (email, password_hash, role)
		VALUES ($1, $2, $3)
		RETURNING id
	`, req.Email, string(hash), req.Role).Scan(&userID)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			WriteError(w, http.StatusConflict, "EMAIL_EXISTS", "Email already exists")
			return
		}
		log.Printf("[Users] Insert error: %v", err)
		WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to create user")
		return
	}

	WriteSuccess(w, map[string]interface{}{
		"id":      userID,
		"message": "User created successfully",
	})
}

// UpdateUser updates an existing user (admin only)
func UpdateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method must be PUT or PATCH")
		return
	}

	if !isAdmin(r) {
		WriteError(w, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	// Extract ID from path
	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/v1/users/")
	idStr = strings.TrimSuffix(idStr, "/")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "INVALID_ID", "Invalid user ID")
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON body")
		return
	}

	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}
	argCount := 1

	if req.Email != nil {
		updates = append(updates, "email = $"+strconv.Itoa(argCount))
		args = append(args, *req.Email)
		argCount++
	}

	if req.Password != nil {
		if len(*req.Password) < 8 {
			WriteError(w, http.StatusBadRequest, "WEAK_PASSWORD", "Password must be at least 8 characters")
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "HASH_ERROR", "Failed to hash password")
			return
		}
		updates = append(updates, "password_hash = $"+strconv.Itoa(argCount))
		args = append(args, string(hash))
		argCount++
	}

	if req.Role != nil {
		updates = append(updates, "role = $"+strconv.Itoa(argCount))
		args = append(args, *req.Role)
		argCount++
	}

	if len(updates) == 0 {
		WriteError(w, http.StatusBadRequest, "NO_UPDATES", "No fields to update")
		return
	}

	// Add ID to args
	args = append(args, id)

	query := "UPDATE users SET " + strings.Join(updates, ", ") + " WHERE id = $" + strconv.Itoa(argCount)
	result, err := database.DB.Exec(query, args...)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			WriteError(w, http.StatusConflict, "EMAIL_EXISTS", "Email already exists")
			return
		}
		log.Printf("[Users] Update error: %v", err)
		WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to update user")
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
		return
	}

	WriteSuccess(w, map[string]string{
		"message": "User updated successfully",
	})
}

// DeleteUser deletes a user (admin only)
func DeleteUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method must be DELETE")
		return
	}

	if !isAdmin(r) {
		WriteError(w, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	// Extract ID from path
	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/v1/users/")
	idStr = strings.TrimSuffix(idStr, "/")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "INVALID_ID", "Invalid user ID")
		return
	}

	// Prevent deleting yourself
	userEmail := getUserEmailFromToken(r)
	var targetEmail string
	database.DB.QueryRow("SELECT email FROM users WHERE id = $1", id).Scan(&targetEmail)
	if targetEmail == userEmail {
		WriteError(w, http.StatusBadRequest, "CANNOT_DELETE_SELF", "Cannot delete your own account")
		return
	}

	result, err := database.DB.Exec("DELETE FROM users WHERE id = $1", id)
	if err != nil {
		log.Printf("[Users] Delete error: %v", err)
		WriteError(w, http.StatusInternalServerError, "DB_ERROR", "Failed to delete user")
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
		return
	}

	WriteSuccess(w, map[string]string{
		"message": "User deleted successfully",
	})
}

// Helper functions
func isAdmin(r *http.Request) bool {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return false
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(database.GetJWTSecret()), nil
	})

	if err != nil || !token.Valid {
		return false
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return false
	}

	role, ok := claims["role"].(string)
	// Hanya super_admin yang bisa akses
	return ok && role == "super_admin"
}

func getUserEmailFromToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return ""
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(database.GetJWTSecret()), nil
	})

	if err != nil || !token.Valid {
		return ""
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return ""
	}

	email, _ := claims["sub"].(string)
	return email
}
