package middleware

import (
	"football-stream/internal/config"
	"log"
	"net/http"
)

// CORS wraps handler with CORS headers and preflight handling.
func CORS(next http.Handler) http.Handler {
	allowedOrigins := config.App.CORS.AllowedOrigins
	if len(allowedOrigins) > 0 {
		log.Printf("[CORS] Allowed origins: %v", allowedOrigins)
	} else {
		log.Println("[CORS] No ALLOWED_ORIGINS set - allowing same-origin only")
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin == "" {
			next.ServeHTTP(w, r)
			return
		}

		if len(allowedOrigins) > 0 {
			allowed := false
			for _, allowedOrigin := range allowedOrigins {
				if allowedOrigin == origin {
					allowed = true
					break
				}
			}

			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Max-Age", "3600")

				if r.Method == http.MethodOptions {
					w.WriteHeader(http.StatusNoContent)
					return
				}
			} else {
				log.Printf("[CORS] Blocked origin: %s", origin)
				http.Error(w, "Origin not allowed", http.StatusForbidden)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}
