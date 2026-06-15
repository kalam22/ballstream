import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const HomePage = lazy(() => import('../pages/HomePage.jsx'))
const StatusPage = lazy(() => import('../pages/StatusPage.jsx'))
const MatchPage = lazy(() => import('../pages/MatchPage.jsx'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'))
const LoginPage = lazy(() => import('../pages/LoginPage.jsx'))
const UsersPage = lazy(() => import('../pages/UsersPage.jsx'))
const ProfilePage = lazy(() => import('../pages/ProfilePage.jsx'))

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', color: 'var(--text-muted)'
    }}>
      <div className="spinner" />
    </div>
  )
}

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

export default function AppRoutes() {
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoute({ page: 'login' })
    }
  }, [isAuthenticated, route.page])

  // If not authenticated and trying to access protected pages, show login
  if (!isAuthenticated && route.page !== 'login') {
    return <Suspense fallback={<LoadingFallback />}><LoginPage /></Suspense>
  }

  let page;
  if (route.page === 'home')    page = <HomePage />;
  else if (route.page === 'status')  page = <StatusPage />;
  else if (route.page === 'login')   page = <LoginPage />;
  else if (route.page === 'profile') page = <ProfilePage />;
  else if (route.page === 'match')   page = <MatchPage id={route.id} />;
  // Role-guarded routes
  else if (route.page === 'users') {
    page = user?.role !== 'super_admin' ? <NotFoundPage /> : <UsersPage />;
  }
  else page = <NotFoundPage />;

  return <Suspense fallback={<LoadingFallback />}>{page}</Suspense>
}
