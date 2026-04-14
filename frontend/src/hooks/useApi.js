import { useState, useEffect, useCallback } from 'react'
import { fetchWithAuth, getCSRFToken, invalidateCSRFToken } from '../utils/api'

// Re-export for consumers that import directly from useApi
export { getCSRFToken, invalidateCSRFToken }

/**
 * Fetches /api/matches and auto-refreshes on interval.
 * Returns { matches, loading, error, countdown }
 */
export function useMatches(refreshMs) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(Math.floor(refreshMs / 1000))

  const fetchMatches = useCallback(() =>
    fetchWithAuth('/api/v1/matches')
      .then(r => r.json())
      .then(response => {
        // Handle new response format with success/data/meta
        const data = response.success ? response.data : response
        setMatches(Array.isArray(data) ? data : [])
        setError(null)
        setCountdown(Math.floor(refreshMs / 1000))
      })
      .catch(err => setError(err.message))
  , [refreshMs])

  useEffect(() => {
    setLoading(true)
    fetchMatches().finally(() => setLoading(false))
  }, [fetchMatches])

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchMatches(); return Math.floor(refreshMs / 1000) }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [fetchMatches, refreshMs])

  return { matches, loading, error, countdown }
}

/**
 * Fetches /api/match/:id for match detail page.
 * Includes sessionStorage persistence for instant refresh.
 */
export function useMatchDetail(id) {
  // Try to load from sessionStorage first
  const getCachedDetail = () => {
    if (!id) return null
    try {
      const cached = sessionStorage.getItem(`match_detail_${id}`)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }
  
  const [detail, setDetail] = useState(getCachedDetail)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    
    const abortController = new AbortController()
    
    // Use async/await to ensure proper sequencing
    const fetchDetail = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetchWithAuth(`/api/v1/match/${encodeURIComponent(id)}`, {
          signal: abortController.signal
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const json = await response.json()
        const data = json.success ? json.data : json
        
        if (data) {
          setDetail(data)
          setError(null)
          // Cache in sessionStorage for instant refresh
          try {
            sessionStorage.setItem(`match_detail_${id}`, JSON.stringify(data))
          } catch (e) {
            console.warn('[useMatchDetail] Failed to cache:', e)
          }
        } else {
          setError('Data tidak tersedia')
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('[useMatchDetail] Error:', err)
        setError(err.message || 'Gagal memuat detail.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchDetail()
    
    return () => abortController.abort()
  }, [id])

  return { detail, loading, error }
}

/**
 * Fetches /api/upstreams every 30 seconds.
 */
export function useUpstreams() {
  const [upstreams, setUpstreams] = useState([])
  const [error, setError] = useState(null)

  const fetch_ = useCallback(() =>
    fetchWithAuth('/api/v1/upstreams')
      .then(r => r.json())
      .then(response => { 
        // Handle new response format with success/data
        const d = response.success ? response.data : response
        setUpstreams(Array.isArray(d) ? d : [])
        setError(null) 
      })
      .catch(err => setError(err.message || 'Upstream data gagal dimuat.'))
  , [])

  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, 30000)
    return () => clearInterval(id)
  }, [fetch_])

  return { upstreams, error }
}

/**
 * Debounce a value by delay ms.
 */
export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
