package main

import (
	"context"
	"football-stream/database"
	"football-stream/handlers"
	"football-stream/internal/config"
	"football-stream/internal/middleware"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"
)

func buildMux() (http.Handler, error) {
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
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
	mux.HandleFunc("/api/v1/auth/verify", handlers.HandleVerifySession)
	mux.HandleFunc("/api/v1/auth/logout", handlers.HandleLogout)
	mux.HandleFunc("/api/v1/auth/csrf", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			handlers.WriteError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method must be GET")
			return
		}
		token := handlers.GenerateCSRFToken()
		handlers.WriteSuccess(w, map[string]string{"csrf_token": token})
	})
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
		path := r.URL.Path
		if strings.HasSuffix(path, "/reset-password") {
			handlers.ResetPassword(w, r)
			return
		}
		if strings.HasSuffix(path, "/reset-session") {
			handlers.ResetSession(w, r)
			return
		}
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

	// Legacy API routes (backward compatibility — alias to v1)
	mux.HandleFunc("/api/matches", handlers.APIProxy)
	mux.HandleFunc("/api/bootstrap", handlers.GetBootstrap)
	mux.HandleFunc("/api/account", handlers.GetAccount)
	mux.HandleFunc("/api/sports", handlers.GetSports)
	mux.HandleFunc("/api/upstreams", handlers.GetUpstreams)
	mux.HandleFunc("/api/match/", handlers.GetMatchDetail)

	if config.App.RateLimit.Enabled {
		mux.HandleFunc("/internal/metrics", handlers.MetricsHandler)
	}

	// Root endpoint
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","message":"Backend API server running. Frontend runs on http://localhost:5173","version":"v1"}`))
	})

	// Apply middleware chain
	handler := middleware.Chain(mux,
		middleware.Gzip,
		middleware.DefaultBodyLimit(),
		middleware.Auth,
		middleware.CSRF,
		middleware.RateLimit,
		middleware.SecurityHeaders,
		middleware.CORS,
		middleware.RequestID,
		middleware.Logging,
	)
	return handler, nil
}

func main() {
	config.Load()
	config.Validate()

	database.InitDB()
	handlers.CleanupExpiredCSRFTokens()

	log.Println("Starting cache updater...")
	go handlers.StartCacheUpdater()

	log.Println("Waiting for initial cache population...")
	handlers.WaitForCacheReady()
	log.Println("Cache ready!")

	securedMux, err := buildMux()
	if err != nil {
		log.Fatalf("Error building mux: %v", err)
	}

	port := config.App.Server.Port
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           securedMux,
		ReadHeaderTimeout: time.Duration(config.App.Server.ReadHeaderTimeout) * time.Second,
		ReadTimeout:       time.Duration(config.App.Server.ReadTimeout) * time.Second,
		WriteTimeout:      time.Duration(config.App.Server.WriteTimeout) * time.Second,
		IdleTimeout:       time.Duration(config.App.Server.IdleTimeout) * time.Second,
		MaxHeaderBytes:    config.App.Server.MaxHeaderBytes,
	}

	go func() {
		log.Printf("Starting server on port %s...", port)
		log.Printf("API v1 available at: http://localhost:%s/api/v1/", port)
		log.Printf("Health check at: http://localhost:%s/health", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Error starting server: %v", err)
		}
	}()

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
