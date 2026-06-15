package middleware

import "net/http"

// Middleware is a function that wraps an http.Handler.
type Middleware func(http.Handler) http.Handler

// Chain composes multiple middleware into one.
// The first middleware is the outermost (runs first on request, last on response).
func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return handler
}
