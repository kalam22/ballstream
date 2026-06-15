package middleware

import (
	"football-stream/handlers"
	"football-stream/internal/config"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

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

// RateLimit is the middleware wrapper.
func RateLimit(next http.Handler) http.Handler {
	cfg := config.App.RateLimit
	if !cfg.Enabled {
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
