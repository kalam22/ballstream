import { useTheme } from '../context/ThemeContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { SunIcon, MoonIcon } from './Icons.jsx'
import { formatCountdown } from '../utils/format.js'
import { AlertTriangle } from 'lucide-react'

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

/**
 * Navbar component.
 * Props:
 *   - activePage: 'home' | 'status' | 'match'
 *   - countdown: number | null (seconds remaining for auto-refresh)
 */
export default function Navbar({ activePage, countdown }) {
  const { account } = useData()

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
            <nav className="nav-links" aria-label="Main navigation">
              <a href="/" className={activePage === 'home' ? 'active' : ''}>Beranda</a>
              <a href="/status" className={activePage === 'status' ? 'active' : ''}>Status</a>
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

            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  )
}
