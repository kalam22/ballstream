import { useTheme } from '../context/ThemeContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { SunIcon, MoonIcon } from './Icons.jsx'
import { formatCountdown } from '../utils/format.js'
import { AlertTriangle, LogOut, User, Settings, Menu, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { swal } from '../utils/swal'

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

export default function Navbar({ activePage, countdown }) {
  const { account } = useData()
  const { user, isAuthenticated, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const remaining = account ? account.daily_limit - account.usage_today : null
  const ratio = account ? account.usage_today / (account.daily_limit || 1) : 0
  const showBanner = remaining !== null && remaining < 20

  return (
    <>
      {showBanner && (
        <div className="global-warning" role="alert">
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>API limit hampir habis — reset dalam {account?.reset_at ?? '--:--:--'}</span>
        </div>
      )}

      <header className="navbar">
        <div className="container nav-inner">
          <div className="nav-left">
            <a href="/" className="logo">
              <span className="logo-dot" />
              kana.stream
            </a>
            <nav className={`nav-links ${mobileMenuOpen ? 'open' : ''}`} aria-label="Main navigation">
              <a href="/" className={activePage === 'home' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>Beranda</a>
              {user?.role === 'super_admin' && (
                <>
                  <a href="/users" className={activePage === 'users' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>Users</a>
                  <a href="/status" className={activePage === 'status' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>Status</a>
                </>
              )}
            </nav>
          </div>

          <div className="nav-right">
            {/* Account chip: only on status page */}
            {activePage === 'status' && account && (
              <div className="account-chip">
                <span className="plan-tag">{account.plan?.toUpperCase()}</span>
                <span className="nav-sep" />
                <span className={`usage-tag${ratio >= 0.9 ? ' err' : ratio >= 0.7 ? ' warn' : ''}`}>
                  {account.usage_today}/{account.daily_limit}
                </span>
                <span className="nav-sep" />
                <span className="reset-tag">{account.reset_at}</span>
              </div>
            )}

            {/* Countdown: only on home page */}
            {activePage === 'home' && countdown != null && (
              <span className="refresh-chip">
                <span className="refresh-dot" />
                {formatCountdown(countdown)}
              </span>
            )}

            {/* User dropdown menu */}
            {isAuthenticated && user && (
              <div className="user-dropdown" ref={dropdownRef}>
                <button 
                  className="user-dropdown-trigger"
                  onClick={() => setShowDropdown(!showDropdown)}
                  aria-label="User menu"
                >
                  <User size={20} />
                </button>

                {showDropdown && (
                  <div className="user-dropdown-menu">
                    <div className="dropdown-header">
                      <User size={16} />
                      <div className="dropdown-user-info">
                        <span className="dropdown-email">{user.email}</span>
                        <span className={`dropdown-role role-${user.role}`}>
                          {user.role === 'super_admin' ? 'Super Admin' : 'User'}
                        </span>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <a href="/profile" className="dropdown-item">
                      <Settings size={16} />
                      <span>Lihat Profil</span>
                    </a>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item dropdown-logout"
                      onClick={async () => {
                        await logout()
                        await swal.success({
                          title: 'Berhasil Logout',
                          text: 'Anda telah logout. Terima kasih!',
                          timer: 2000,
                        })
                        window.location.href = '/login'
                      }}
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <ThemeToggle />

            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
