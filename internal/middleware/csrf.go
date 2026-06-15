package middleware

import (
	"football-stream/handlers"
	"net/http"
)

// CSRF validates CSRF tokens for state-changing requests.
// Token generation and validation remain in handlers/csrf.go.
func CSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		if r.URL.Path == "/api/v1/auth/login" || r.URL.Path == "/api/auth/login" ||
			r.URL.Path == "/api/v1/auth/logout" || r.URL.Path == "/api/auth/logout" {
			next.ServeHTTP(w, r)
			return
		}

		token := r.Header.Get("X-CSRF-Token")
		if !handlers.ValidateCSRFToken(token) {
			handlers.WriteError(w, http.StatusForbidden, "CSRF_TOKEN_INVALID", "Invalid or missing CSRF token")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// GenerateCSRFToken is a convenience wrapper.
func GenerateCSRFToken() string {
	return handlers.GenerateCSRFToken()
}
