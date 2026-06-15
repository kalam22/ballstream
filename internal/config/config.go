package config

import (
	"bufio"
	"log"
	"os"
	"strconv"
	"strings"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	RateLimit RateLimitConfig
	CORS      CORSConfig
	Env       string
	Upstream  UpstreamConfig
}

type ServerConfig struct {
	Port              string
	ReadHeaderTimeout int // seconds
	ReadTimeout       int
	WriteTimeout      int
	IdleTimeout       int
	MaxHeaderBytes    int
}

type DatabaseConfig struct {
	DSN             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime int // minutes
	JWTSecret       string
}

type JWTConfig struct {
	Secret string
	Expiry int // hours
}

type RateLimitConfig struct {
	Enabled    bool
	RPSHTML    float64
	BurstHTML  float64
	RPSAPI     float64
	BurstAPI   float64
	TrustProxy bool
}

type CORSConfig struct {
	AllowedOrigins []string
}

type UpstreamConfig struct {
	MaxInflight int
}

var App Config

// Load reads configuration from environment variables.
// .env file is loaded first (real env vars take priority).
func Load() {
	loadEnvFile(".env")

	App = Config{
		Server: ServerConfig{
			Port:              envString("PORT", "8081"),
			ReadHeaderTimeout: envInt("SERVER_READ_HEADER_TIMEOUT", 5),
			ReadTimeout:       envInt("SERVER_READ_TIMEOUT", 10),
			WriteTimeout:      envInt("SERVER_WRITE_TIMEOUT", 30),
			IdleTimeout:       envInt("SERVER_IDLE_TIMEOUT", 60),
			MaxHeaderBytes:    1 << 20,
		},
		Database: DatabaseConfig{
			DSN:             os.Getenv("DATABASE_URL"),
			MaxOpenConns:    envInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    envInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: envInt("DB_CONN_MAX_LIFETIME", 5),
			JWTSecret:       envString("JWT_SECRET", ""),
		},
		JWT: JWTConfig{
			Secret: envString("JWT_SECRET", ""),
			Expiry: envInt("JWT_EXPIRY_HOURS", 24),
		},
		RateLimit: RateLimitConfig{
			Enabled:    envBool("RATE_LIMIT_ENABLED", true),
			RPSHTML:    envFloat("RATE_LIMIT_RPS_HTML", 5),
			BurstHTML:  envFloat("RATE_LIMIT_BURST_HTML", 20),
			RPSAPI:     envFloat("RATE_LIMIT_RPS_API", 3),
			BurstAPI:   envFloat("RATE_LIMIT_BURST_API", 10),
			TrustProxy: envBool("TRUST_PROXY_HEADERS", false),
		},
		CORS: CORSConfig{
			AllowedOrigins: parseAllowedOrigins(os.Getenv("ALLOWED_ORIGINS")),
		},
		Env: strings.ToLower(strings.TrimSpace(os.Getenv("ENV"))),
		Upstream: UpstreamConfig{
			MaxInflight: envInt("UPSTREAM_MAX_INFLIGHT", 0),
		},
	}

	log.Printf("[Config] env=%s port=%s rate_limit=%t trust_proxy=%t upstream_max_inflight=%d",
		App.Env, App.Server.Port, App.RateLimit.Enabled, App.RateLimit.TrustProxy, App.Upstream.MaxInflight)
}

// Validation errors are fatal — config must be correct at startup.
func Validate() {
	if App.Env == "production" && App.CORS.AllowedOrigins == nil {
		log.Fatal("ALLOWED_ORIGINS must be set in production")
	}
}

// --- helpers ---

func loadEnvFile(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
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
		if os.Getenv(key) == "" {
			os.Setenv(key, val)
		}
	}
}

func envString(key, fallback string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v
}

func envInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return fallback
	}
	return v
}

func envFloat(key string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil || v <= 0 {
		return fallback
	}
	return v
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

func parseAllowedOrigins(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	if len(origins) == 0 {
		return nil
	}
	return origins
}
