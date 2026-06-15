package middleware

import (
	"football-stream/handlers"
	"log"
	"net"
	"net/http"
	"strings"
	"time"
)

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// Logging logs each request with method, path, status code, and duration.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lrw := &loggingResponseWriter{w, http.StatusOK}

		next.ServeHTTP(lrw, r)
		handlers.RecordHTTPRequest(r.URL.Path, lrw.statusCode)

		log.Printf("%-6s %-30s %3d %v", r.Method, r.URL.Path, lrw.statusCode, time.Since(start))
	})
}

// RequestID adds X-Request-ID header to every response.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = handlers.GenerateRequestID()
		}
		w.Header().Set("X-Request-ID", requestID)
		next.ServeHTTP(w, r)
	})
}

// extractClientIP returns the client's real IP address.
func extractClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil {
		if parsed := net.ParseIP(host); parsed != nil {
			return parsed.String()
		}
	}
	if parsed := net.ParseIP(strings.TrimSpace(r.RemoteAddr)); parsed != nil {
		return parsed.String()
	}
	return "unknown"
}
