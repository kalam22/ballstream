package middleware

import (
	"football-stream/internal/config"
	"net/http"
	"strings"
)

// SecurityHeaders adds security headers to all responses.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		isHTMLPage := !strings.HasPrefix(r.URL.Path, "/api/") &&
			!strings.HasPrefix(r.URL.Path, "/internal/") &&
			!strings.HasSuffix(r.URL.Path, ".js") &&
			!strings.HasSuffix(r.URL.Path, ".css")

		if isHTMLPage {
			directives := []string{
				"default-src 'self'",
				"base-uri 'self'",
				"object-src 'none'",
				"frame-ancestors 'none'",
				"form-action 'self'",
				"img-src 'self' data: https:",
				"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
				"font-src 'self' https://fonts.gstatic.com",
				"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
				"connect-src 'self' https://www.google-analytics.com",
				"frame-src https:",
			}
			if r.TLS != nil {
				directives = append(directives, "upgrade-insecure-requests")
				w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
			}
			csp := strings.Join(directives, "; ")
			w.Header().Set("Content-Security-Policy", csp)
		}

		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		if strings.HasPrefix(r.URL.Path, "/api/") && r.URL.Path != "/api/matches" && r.URL.Path != "/api/v1/matches" {
			w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
			w.Header().Set("Pragma", "no-cache")
		}

		next.ServeHTTP(w, r)
	})
}

// BodyLimit limits request body size for non-GET requests.
func BodyLimit(limit int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodGet && r.Method != http.MethodHead {
				r.Body = http.MaxBytesReader(w, r.Body, limit)
			}
			next.ServeHTTP(w, r)
		})
	}
}

// DefaultBodyLimit returns a BodyLimit with 1MB.
func DefaultBodyLimit() func(http.Handler) http.Handler {
	return BodyLimit(1 << 20)
}

var _ = config.App // ensure config is importable
