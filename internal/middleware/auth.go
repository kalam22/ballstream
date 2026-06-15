package middleware

import (
	"football-stream/handlers"
	"football-stream/internal/config"
	"log"
	"net/http"
	"os"
	"strings"
)

// Auth provides API key + JWT authentication middleware.
func Auth(next http.Handler) http.Handler {
	validKeysStr := strings.TrimSpace(os.Getenv("CLIENT_API_KEYS"))
	env := config.App.Env

	var validKeys []string
	if validKeysStr != "" {
		validKeys = strings.Split(validKeysStr, ",")
		for i := range validKeys {
			validKeys[i] = strings.TrimSpace(validKeys[i])
		}
	}

	if env == "production" && len(validKeys) == 0 {
		log.Fatal("CLIENT_API_KEYS must be set in production environment")
	}

	if len(validKeys) == 0 {
		log.Println("[Auth] API authentication disabled - public access allowed")
	} else {
		log.Println("[Auth] API key authentication enabled")
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/internal/") {
			next.ServeHTTP(w, r)
			return
		}

		if len(validKeys) == 0 {
			next.ServeHTTP(w, r)
			return
		}

		if strings.HasPrefix(r.URL.Path, "/api/auth/") || strings.HasPrefix(r.URL.Path, "/api/v1/auth/") {
			next.ServeHTTP(w, r)
			return
		}

		if r.Method == http.MethodGet && (r.URL.Path == "/api/matches" || r.URL.Path == "/api/v1/matches" ||
			r.URL.Path == "/api/bootstrap" || r.URL.Path == "/api/v1/bootstrap" ||
			r.URL.Path == "/api/account" || r.URL.Path == "/api/v1/account" ||
			r.URL.Path == "/api/sports" || r.URL.Path == "/api/v1/sports" ||
			r.URL.Path == "/api/upstreams" || r.URL.Path == "/api/v1/upstreams" ||
			strings.HasPrefix(r.URL.Path, "/api/match/") || strings.HasPrefix(r.URL.Path, "/api/v1/match/")) {
			next.ServeHTTP(w, r)
			return
		}

		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" && env != "production" {
			apiKey = r.URL.Query().Get("api_key")
		}

		hasValidJWT := false
		if _, valid := handlers.ExtractClaims(r); valid {
			hasValidJWT = true
		}

		if apiKey == "" && !hasValidJWT {
			handlers.WriteError(w, http.StatusUnauthorized, handlers.ErrMissingAPIKey, "Missing API key or Token")
			return
		}

		valid := hasValidJWT
		if !valid && apiKey != "" {
			for _, key := range validKeys {
				if key != "" && key == apiKey {
					valid = true
					break
				}
			}
		}

		if !valid {
			log.Printf("[Auth] Invalid key or token attempt from %s", extractClientIP(r))
			handlers.WriteError(w, http.StatusForbidden, handlers.ErrInvalidAPIKey, "Invalid credentials")
			return
		}

		next.ServeHTTP(w, r)
	})
}
