package handlers

import (
	"encoding/json"
	"net/http"
)

// Error codes for programmatic handling
const (
	ErrInvalidMatchID      = "INVALID_MATCH_ID"
	ErrMatchNotFound       = "MATCH_NOT_FOUND"
	ErrRateLimitExceeded   = "RATE_LIMIT_EXCEEDED"
	ErrInvalidAPIKey       = "INVALID_API_KEY"
	ErrMissingAPIKey       = "MISSING_API_KEY"
	ErrUpstreamFailure     = "UPSTREAM_FAILURE"
	ErrInvalidPagination   = "INVALID_PAGINATION"
	ErrInternalServerError = "INTERNAL_SERVER_ERROR"
)

// APIError represents a standardized error response
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// APIResponse represents a standardized API response envelope
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

// Meta contains pagination and other metadata
type Meta struct {
	Page       int `json:"page,omitempty"`
	Limit      int `json:"limit,omitempty"`
	Total      int `json:"total,omitempty"`
	TotalPages int `json:"total_pages,omitempty"`
}

// WriteError writes a standardized error response
func WriteError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
		},
	})
}

// WriteErrorWithDetails writes a standardized error response with additional details
func WriteErrorWithDetails(w http.ResponseWriter, status int, code, message, details string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

// WriteSuccess writes a standardized success response
func WriteSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    data,
	})
}

// WriteSuccessWithMeta writes a standardized success response with metadata
func WriteSuccessWithMeta(w http.ResponseWriter, data interface{}, meta *Meta) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}
