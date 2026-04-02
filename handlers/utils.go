package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
)

// GetIntParam extracts an integer query parameter with a default value
func GetIntParam(r *http.Request, key string, defaultValue int) int {
	val := r.URL.Query().Get(key)
	if val == "" {
		return defaultValue
	}
	
	intVal, err := strconv.Atoi(val)
	if err != nil || intVal < 1 {
		return defaultValue
	}
	
	return intVal
}

// GenerateRequestID generates a unique request ID
func GenerateRequestID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Fallback to timestamp-based ID if random fails
		return strconv.FormatInt(int64(1000000000), 36)
	}
	return hex.EncodeToString(b)
}

// CalculatePagination calculates pagination boundaries
func CalculatePagination(total, page, limit int) (start, end int) {
	start = (page - 1) * limit
	if start < 0 {
		start = 0
	}
	if start >= total {
		start = total
	}
	
	end = start + limit
	if end > total {
		end = total
	}
	
	return start, end
}

// CalculateTotalPages calculates total pages for pagination
func CalculateTotalPages(total, limit int) int {
	if limit <= 0 {
		return 0
	}
	return (total + limit - 1) / limit
}
