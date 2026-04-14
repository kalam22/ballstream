/**
 * Shared authenticated fetch utility.
 * Single source of truth for API key + CSRF token injection.
 * Used by both useApi.js and DataContext.jsx.
 */

const API_KEY = import.meta.env.VITE_API_KEY || ''

// CSRF token cache — cleared after each use (single-use tokens)
let csrfToken = null

export const getCSRFToken = async () => {
  if (csrfToken) return csrfToken
  try {
    const response = await fetch('/api/v1/auth/csrf')
    const data = await response.json()
    csrfToken = data.data?.csrf_token || data.csrf_token
    return csrfToken
  } catch (err) {
    console.error('[CSRF] Failed to get token:', err)
    return null
  }
}

export const invalidateCSRFToken = () => {
  csrfToken = null
}

export const fetchWithAuth = async (url, options = {}) => {
  const headers = { ...options.headers }

  if (API_KEY) {
    headers['X-API-Key'] = API_KEY
  }

  const method = options.method?.toUpperCase() || 'GET'
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCSRFToken()
    if (token) {
      headers['X-CSRF-Token'] = token
    }
    // Single-use: invalidate so next mutating request fetches a fresh token
    invalidateCSRFToken()
  }

  return fetch(url, { ...options, headers })
}
