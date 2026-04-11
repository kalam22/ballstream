package main

import (
	"bufio"
	"compress/gzip"
	"context"
	"fmt"
	"football-stream/database"
	"football-stream/handlers"
	"io"
	"log"
	"math"
	"net"
	"net/http"
	"os"

	"github.com/golang-jwt/jwt/v5"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

// ... previous code ...
// [Logic from hardening.go starts here]

type rateLimitGroupConfig struct {
	rps   float64
	burst float64
}

type rateLimitBucket struct {
	tokens     float64
	lastRefill time.Time
	lastSeen   time.Time
}

type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*rateLimitBucket
	html    rateLimitGroupConfig
	api     rateLimitGroupConfig
	obs     rateLimitGroupConfig
}

func newRateLimiter() *rateLimiter {
	rl := &rateLimiter{
		buckets: make(map[string]*rateLimitBucket),
		html: rateLimitGroupConfig{
			rps:   parseEnvFloat("RATE_LIMIT_RPS_HTML", 5),
			burst: parseEnvFloat("RATE_LIMIT_BURST_HTML", 20),
		},
		api: rateLimitGroupConfig{
			rps:   parseEnvFloat("RATE_LIMIT_RPS_API", 3),
			burst: parseEnvFloat("RATE_LIMIT_BURST_API", 10),
		},
	}
	rl.obs = rateLimitGroupConfig{
		rps:   math.Max(1, math.Min(rl.api.rps, 1)),
		burst: math.Max(2, math.Min(rl.api.burst, 4)),
	}
	go rl.cleanupLoop()
	return rl
}

func (rl *rateLimiter) cleanupLoop() {
	ticker := time.NewTicker(2 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-10 * time.Minute)
		rl.mu.Lock()
		for key, bucket := range rl.buckets {
			if bucket.lastSeen.Before(cutoff) {
				delete(rl.buckets, key)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *rateLimiter) allow(ip, path string, now time.Time) bool {
	cfg := rl.configForPath(path)
	key := rateLimitGroup(path) + ":" + ip

	rl.mu.Lock()
	defer rl.mu.Unlock()

	bucket, ok := rl.buckets[key]
	if !ok {
		rl.buckets[key] = &rateLimitBucket{
			tokens:     cfg.burst - 1,
			lastRefill: now,
			lastSeen:   now,
		}
		return true
	}

	elapsed := now.Sub(bucket.lastRefill).Seconds()
	if elapsed > 0 {
		bucket.tokens = math.Min(cfg.burst, bucket.tokens+(elapsed*cfg.rps))
		bucket.lastRefill = now
	}
	bucket.lastSeen = now
	if bucket.tokens < 1 {
		return false
	}
	bucket.tokens--
	return true
}

func rateLimitGroup(path string) string {
	switch {
	case strings.HasPrefix(path, "/api/upstreams"):
		return "api_upstreams"
	case strings.HasPrefix(path, "/internal/metrics"):
		return "internal_metrics"
	case strings.HasPrefix(path, "/api/"):
		return "api"
	default:
		return "api"
	}
}

func (rl *rateLimiter) configForPath(path string) rateLimitGroupConfig {
	switch {
	case strings.HasPrefix(path, "/api/upstreams"), strings.HasPrefix(path, "/internal/metrics"):
		return rl.obs
	case strings.HasPrefix(path, "/api/"):
		return rl.api
	default:
		return rl.api
	}
}

func parseEnvFloat(key string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func envBool(key string, fallback bool) bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if raw == "" {
		return fallback
	}
	switch raw {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func extractClientIP(r *http.Request) string {
	if envBool("TRUST_PROXY_HEADERS", false) {
		if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
			for _, part := range strings.Split(forwarded, ",") {
				ip := strings.TrimSpace(part)
				if parsed := net.ParseIP(ip); parsed != nil {
					return parsed.String()
				}
			}
		}
		if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
			if parsed := net.ParseIP(realIP); parsed != nil {
				return parsed.String()
			}
		}
	}

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

func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = handlers.GenerateRequestID()
		}
		w.Header().Set("X-Request-ID", requestID)
		next.ServeHTTP(w, r)
	})
}

func rateLimitMiddleware(next http.Handler) http.Handler {
	if !envBool("RATE_LIMIT_ENABLED", true) {
		return next
	}

	limiter := newRateLimiter()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := extractClientIP(r)
		if limiter.allow(ip, r.URL.Path, time.Now()) {
			next.ServeHTTP(w, r)
			return
		}

		handlers.RecordRateLimited(r.URL.Path)
		w.Header().Set("Retry-After", "1")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte(`{"success":false,"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests"}}`))
	})
}

func internalMetricsEnabled() bool {
	return envBool("ENABLE_INTERNAL_METRICS", true)
}

func logHardeningConfig() {
	log.Printf(
		"[Hardening] rate_limit=%t trust_proxy=%t metrics=%t upstream_max_inflight=%s",
		envBool("RATE_LIMIT_ENABLED", true),
		envBool("TRUST_PROXY_HEADERS", false),
		internalMetricsEnabled(),
		strings.TrimSpace(os.Getenv("UPSTREAM_MAX_INFLIGHT")),
	)
}

// loadEnv reads a .env file and sets variables as environment variables.
// Existing env vars take priority (so real env overrides .env).
func loadEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return // .env optional — silently skip if not found
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		// Real environment vars take priority over .env
		if os.Getenv(key) == "" {
			os.Setenv(key, val)
		}
	}
}

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lrw := &loggingResponseWriter{w, http.StatusOK}

		next.ServeHTTP(lrw, r)
		handlers.RecordHTTPRequest(r.URL.Path, lrw.statusCode)

		log.Printf("%-6s %-30s %3d %v", r.Method, r.URL.Path, lrw.statusCode, time.Since(start))
	})
}

// GZIP Middleware for performance optimization
type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

func gzipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Add("Vary", "Accept-Encoding")
		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w)
		defer gz.Close()
		gzr := gzipResponseWriter{Writer: gz, ResponseWriter: w}
		next.ServeHTTP(gzr, r)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	allowedOriginsStr := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	
	var allowedOrigins []string
	if allowedOriginsStr != "" {
		allowedOrigins = strings.Split(allowedOriginsStr, ",")
		for i := range allowedOrigins {
			allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
		}
		log.Printf("[CORS] Allowed origins: %v", allowedOrigins)
	} else {
		log.Println("[CORS] No ALLOWED_ORIGINS set - allowing same-origin only")
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		
		// If no Origin header, it's a same-origin request (allowed)
		if origin == "" {
			next.ServeHTTP(w, r)
			return
		}

		// If Origin header present, check allowlist
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
				// Origin present but not allowed
				log.Printf("[CORS] Blocked origin: %s", origin)
				http.Error(w, "Origin not allowed", http.StatusForbidden)
				return
			}
		}
		
		next.ServeHTTP(w, r)
	})
}

func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip CSP for HTML pages to allow inline scripts (theme init)
		// Only apply strict CSP to API endpoints
		isHTMLPage := !strings.HasPrefix(r.URL.Path, "/api/") && 
		              !strings.HasPrefix(r.URL.Path, "/internal/") &&
		              !strings.HasSuffix(r.URL.Path, ".js") &&
		              !strings.HasSuffix(r.URL.Path, ".css")
		
		if isHTMLPage {
			// Relaxed CSP for HTML pages (allows inline scripts for theme init)
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
		
		// Prevent caching of sensitive API responses
		if strings.HasPrefix(r.URL.Path, "/api/") && r.URL.Path != "/api/matches" {
			w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
			w.Header().Set("Pragma", "no-cache")
		}
		
		next.ServeHTTP(w, r)
	})
}

func requestBodyLimitMiddleware(limit int64, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			r.Body = http.MaxBytesReader(w, r.Body, limit)
		}
		next.ServeHTTP(w, r)
	})
}

func apiKeyMiddleware(next http.Handler) http.Handler {
	validKeysStr := strings.TrimSpace(os.Getenv("CLIENT_API_KEYS"))
	authRequired := envBool("API_AUTH_REQUIRED", false)
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENV")))
	
	// Force authentication in production
	if env == "production" && validKeysStr == "" {
		log.Fatal("CLIENT_API_KEYS must be set in production environment")
	}
	
	// Parse valid keys if provided
	var validKeys []string
	if validKeysStr != "" {
		validKeys = strings.Split(validKeysStr, ",")
		for i := range validKeys {
			validKeys[i] = strings.TrimSpace(validKeys[i])
		}
	}

	// Log authentication mode
	if validKeysStr == "" && !authRequired {
		log.Println("[Auth] API authentication disabled - public access allowed")
	} else if authRequired {
		log.Println("[Auth] API authentication REQUIRED for all endpoints")
	} else {
		log.Println("[Auth] API authentication optional - public read-only access allowed")
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for internal metrics (protected by nginx)
		if strings.HasPrefix(r.URL.Path, "/internal/") {
			next.ServeHTTP(w, r)
			return
		}

		// If no keys configured and auth not required, allow all requests
		if validKeysStr == "" && !authRequired {
			next.ServeHTTP(w, r)
			return
		}

		// Auth endpoints are always public (no API key needed)
		if strings.HasPrefix(r.URL.Path, "/api/auth/") {
			next.ServeHTTP(w, r)
			return
		}

		// If auth not required, allow public read-only endpoints
		if !authRequired {
			if r.Method == http.MethodGet && (
				r.URL.Path == "/api/matches" ||
				r.URL.Path == "/api/v1/matches" ||
				r.URL.Path == "/api/bootstrap" ||
				r.URL.Path == "/api/v1/bootstrap" ||
				r.URL.Path == "/api/account" ||
				r.URL.Path == "/api/v1/account" ||
				r.URL.Path == "/api/sports" ||
				r.URL.Path == "/api/v1/sports" ||
				r.URL.Path == "/api/upstreams" ||
				r.URL.Path == "/api/v1/upstreams" ||
				strings.HasPrefix(r.URL.Path, "/api/match/") ||
				strings.HasPrefix(r.URL.Path, "/api/v1/match/")) {
				next.ServeHTTP(w, r)
				return
			}
		}

		// Check API key in header only (not query params in production)
		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" && env != "production" {
			// Allow query param in non-production environments
			apiKey = r.URL.Query().Get("api_key")
		}

		// Also check JWT token
		authHeader := r.Header.Get("Authorization")
		hasValidJWT := false
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method")
				}
				return []byte(os.Getenv("JWT_SECRET")), nil
			})
			if token != nil && token.Valid {
				hasValidJWT = true
			}
		}

		if apiKey == "" && !hasValidJWT {
			handlers.WriteError(w, http.StatusUnauthorized, handlers.ErrMissingAPIKey, "Missing API key or Token")
			return
		}

		// Validate API key and Token
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

func buildMux(lastModified time.Time) (http.Handler, error) {
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		// Check if cache is populated
		matches := handlers.GetMatchesFromCache()
		if matches == nil || len(matches) == 0 {
			handlers.WriteError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Cache not ready")
			return
		}
		
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","cache_size":` + strconv.Itoa(len(matches)) + `}`))
	})

	// API v1 routes (versioned)
	mux.HandleFunc("/api/v1/auth/login", handlers.HandleLogin)
	mux.HandleFunc("/api/v1/matches", handlers.APIProxy)
	mux.HandleFunc("/api/v1/bootstrap", handlers.GetBootstrap)
	mux.HandleFunc("/api/v1/account", handlers.GetAccount)
	mux.HandleFunc("/api/v1/sports", handlers.GetSports)
	mux.HandleFunc("/api/v1/upstreams", handlers.GetUpstreams)
	mux.HandleFunc("/api/v1/match/", handlers.GetMatchDetail)
	
	// User Management routes (admin only)
	mux.HandleFunc("/api/v1/users", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handlers.GetUsers(w, r)
		} else if r.Method == http.MethodPost {
			handlers.CreateUser(w, r)
		} else {
			handlers.WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		}
	})
	mux.HandleFunc("/api/v1/users/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetUser(w, r)
		case http.MethodPut, http.MethodPatch:
			handlers.UpdateUser(w, r)
		case http.MethodDelete:
			handlers.DeleteUser(w, r)
		default:
			handlers.WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		}
	})
	
	// Legacy API routes (backward compatibility - alias to v1)
	mux.HandleFunc("/api/matches", handlers.APIProxy)
	mux.HandleFunc("/api/bootstrap", handlers.GetBootstrap)
	mux.HandleFunc("/api/account", handlers.GetAccount)
	mux.HandleFunc("/api/sports", handlers.GetSports)
	mux.HandleFunc("/api/upstreams", handlers.GetUpstreams)
	mux.HandleFunc("/api/match/", handlers.GetMatchDetail)
	
	if internalMetricsEnabled() {
		mux.HandleFunc("/internal/metrics", handlers.MetricsHandler)
	}

	// Root endpoint
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","message":"Backend API server running. Frontend runs on http://localhost:5173","version":"v1"}`))
	})

	// Apply middlewares: mux -> gzip -> body limit -> API auth -> rate limit -> security headers -> CORS -> request ID -> logging
	compressedMux := gzipMiddleware(mux)
	limitedMux := requestBodyLimitMiddleware(1<<20, compressedMux)
	authMux := apiKeyMiddleware(limitedMux)
	rateLimitedMux := rateLimitMiddleware(authMux)
	securedMux := securityHeadersMiddleware(rateLimitedMux)
	corsMux := corsMiddleware(securedMux)
	requestIDMux := requestIDMiddleware(corsMux)
	loggedMux := loggingMiddleware(requestIDMux)
	return loggedMux, nil
}

func main() {
	// Load .env file (real env vars take priority)
	loadEnv(".env")
	lastModified := time.Now().UTC()

	// Initialize the Database (this connects and seeds the initial users if empty)
	database.InitDB()

	// Start background cache updater
	log.Println("Starting cache updater...")
	go handlers.StartCacheUpdater()
	
	// Wait for initial cache population
	log.Println("Waiting for initial cache population...")
	handlers.WaitForCacheReady()
	log.Println("Cache ready!")
	
	logHardeningConfig()

	securedMux, err := buildMux(lastModified)
	if err != nil {
		log.Fatalf("Error building mux: %v", err)
	}

	// Get port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	// Create HTTP server with proper timeouts
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           securedMux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	// Run server in a goroutine so we can listen for OS signals
	go func() {
		log.Printf("Starting server on port %s...", port)
		log.Printf("API v1 available at: http://localhost:%s/api/v1/", port)
		log.Printf("Health check at: http://localhost:%s/health", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Error starting server: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server exited cleanly.")
}
