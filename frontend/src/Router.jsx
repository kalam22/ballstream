import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage.jsx'
import StatusPage from './pages/StatusPage.jsx'
import MatchPage from './pages/MatchPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import { useAuth } from './context/AuthContext.jsx'

function getRoute(pathname) {
  if (pathname === '/')        return { page: 'home' }
  if (pathname === '/status')  return { page: 'status' }
  if (pathname === '/login')   return { page: 'login' }
  if (pathname === '/users')   return { page: 'users' }
  if (pathname === '/profile') return { page: 'profile' }
  const matchRe = /^\/match\/(.+)$/
  const m = pathname.match(matchRe)
  if (m) return { page: 'match', id: decodeURIComponent(m[1]) }
  return { page: 'notfound' }
}

export default function Router() {
  const { isAuthenticated, user } = useAuth()
  const [route, setRoute] = useState(() => getRoute(window.location.pathname))

  useEffect(() => {
    const onPop = () => setRoute(getRoute(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest('a[href]')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || a.target) return
      if (a.hasAttribute('download') || a.rel === 'external') return
      e.preventDefault()
      window.history.pushState({}, '', href)
      setRoute(getRoute(href))
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Redirect to login if not authenticated (except for login page)
  useEffect(() => {
    if (!isAuthenticated && route.page !== 'login') {
      window.history.pushState({}, '', '/login')
      setRoute({ page: 'login' })
    }
  }, [isAuthenticated, route.page])

  // If not authenticated and trying to access protected pages, show login
  if (!isAuthenticated && route.page !== 'login') {
    return <LoginPage />
  }

  if (route.page === 'home')    return <HomePage />
  if (route.page === 'status')  return <StatusPage />
  if (route.page === 'login')   return <LoginPage />
  if (route.page === 'profile') return <ProfilePage />
  if (route.page === 'match')   return <MatchPage id={route.id} />

  // Role-guarded routes
  if (route.page === 'users') {
    if (user?.role !== 'super_admin') return <NotFoundPage />
    return <UsersPage />
  }

  return <NotFoundPage />
}
