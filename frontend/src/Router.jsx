import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage.jsx'
import StatusPage from './pages/StatusPage.jsx'
import MatchPage from './pages/MatchPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

/**
 * Minimal client-side router — no library needed for 3 routes.
 * Handles: / | /status | /match/:id
 */
function getRoute(pathname) {
  if (pathname === '/') return { page: 'home' }
  if (pathname === '/status') return { page: 'status' }
  const matchRe = /^\/match\/(.+)$/
  const m = pathname.match(matchRe)
  if (m) return { page: 'match', id: decodeURIComponent(m[1]) }
  return { page: 'notfound' }
}

export default function Router() {
  const [route, setRoute] = useState(() => getRoute(window.location.pathname))

  useEffect(() => {
    const onPop = () => setRoute(getRoute(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Expose navigate globally so <a> clicks can use pushState
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest('a[href]')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || a.target) return
      e.preventDefault()
      window.history.pushState({}, '', href)
      setRoute(getRoute(href))
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  if (route.page === 'home')   return <HomePage />
  if (route.page === 'status') return <StatusPage />
  if (route.page === 'match')  return <MatchPage id={route.id} />

  return <NotFoundPage />
}
