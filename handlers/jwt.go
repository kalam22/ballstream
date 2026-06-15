package handlers

import (
	"football-stream/database"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// ExtractClaims parses and validates the JWT token from the Authorization header.
// Returns claims, whether the token is valid, and the email if session check passed.
func ExtractClaims(r *http.Request) (jwt.MapClaims, bool) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, false
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(database.GetJWTSecret()), nil
	})
	if err != nil || token == nil {
		return nil, false
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, false
	}

	// Extract identity from standard Claims
	email, _ := claims["sub"].(string)
	sessionID, _ := claims["session_id"].(string)
	if email == "" || sessionID == "" || database.DB == nil {
		return nil, false
	}

	var dbSessionID string
	dbErr := database.DB.QueryRow("SELECT session_id FROM users WHERE email = $1", email).Scan(&dbSessionID)
	if dbErr != nil || dbSessionID != sessionID {
		return nil, false
	}

	return claims, true
}

// IsAdmin checks if the request comes from a super_admin user.
func IsAdmin(r *http.Request) bool {
	claims, valid := ExtractClaims(r)
	if !valid {
		return false
	}
	role, ok := claims["role"].(string)
	return ok && role == "super_admin"
}

// GetUserEmail returns the email from a validated JWT token.
func GetUserEmail(r *http.Request) string {
	claims, valid := ExtractClaims(r)
	if !valid {
		return ""
	}
	email, _ := claims["sub"].(string)
	return email
}
