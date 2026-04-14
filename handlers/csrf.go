package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"sync"
	"time"
)

const (
	csrfTokenLength = 32
	csrfTokenTTL    = 24 * time.Hour
)

type csrfToken struct {
	value     string
	createdAt time.Time
}

var (
	csrfTokens = make(map[string]csrfToken)
	csrfMutex  sync.RWMutex
)

// GenerateCSRFToken creates a new CSRF token
func GenerateCSRFToken() string {
	b := make([]byte, csrfTokenLength)
	rand.Read(b)
	token := base64.URLEncoding.EncodeToString(b)
	
	csrfMutex.Lock()
	csrfTokens[token] = csrfToken{
		value:     token,
		createdAt: time.Now(),
	}
	csrfMutex.Unlock()
	
	return token
}

// ValidateCSRFToken checks if a CSRF token is valid and invalidates it (single-use)
func ValidateCSRFToken(token string) bool {
	if token == "" {
		return false
	}

	csrfMutex.Lock()
	defer csrfMutex.Unlock()

	stored, exists := csrfTokens[token]
	if !exists {
		return false
	}

	// Check if token is expired
	if time.Since(stored.createdAt) > csrfTokenTTL {
		delete(csrfTokens, token)
		return false
	}

	// Single-use: delete after successful validation
	delete(csrfTokens, token)
	return true
}

// CleanupExpiredCSRFTokens removes expired tokens
func CleanupExpiredCSRFTokens() {
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		for range ticker.C {
			csrfMutex.Lock()
			for token, stored := range csrfTokens {
				if time.Since(stored.createdAt) > csrfTokenTTL {
					delete(csrfTokens, token)
				}
			}
			csrfMutex.Unlock()
		}
	}()
}

// CSRFMiddleware validates CSRF tokens for state-changing requests
func CSRFMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip CSRF for GET, HEAD, OPTIONS
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}
		
		// Skip CSRF for login and logout endpoints (uses credentials/JWT)
		if r.URL.Path == "/api/v1/auth/login" || r.URL.Path == "/api/auth/login" || 
		   r.URL.Path == "/api/v1/auth/logout" || r.URL.Path == "/api/auth/logout" {
			next.ServeHTTP(w, r)
			return
		}
		
		// Validate CSRF token
		token := r.Header.Get("X-CSRF-Token")
		if !ValidateCSRFToken(token) {
			WriteError(w, http.StatusForbidden, "CSRF_TOKEN_INVALID", "Invalid or missing CSRF token")
			return
		}
		
		next.ServeHTTP(w, r)
	})
}
