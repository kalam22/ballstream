import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Icon } from '../components/Icons'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { swal } from '../utils/swal'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await login(email, password)
    if (res.success) {
      window.location.href = '/'
    } else if (res.code === 'ALREADY_LOGGED_IN') {
      setIsLoading(false)
      await swal.alreadyLoggedIn(email)
    } else if (res.code === 'INTERNAL_ERROR' || !res.code) {
      // Network/server error — show swal
      setIsLoading(false)
      await swal.error({ title: 'Gagal Terhubung', text: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' })
    } else {
      // Auth error (wrong password, etc) — keep inline for fast feedback
      setError(res.error || 'Email atau password salah. Silakan coba lagi.')
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-brand">
          <div className="login-brand-content">
            <a href="/" className="login-logo">
              <div className="logo-icon">⚽</div>
              <span className="logo-text">kana.stream</span>
            </a>
            <h1 className="login-brand-title">
              Live Match Center
            </h1>
            <p className="login-brand-subtitle">
              Pantau pertandingan sepak bola live, jadwal upcoming, dan hasil terbaru dari berbagai liga dunia.
            </p>
            <div className="login-brand-features">
              <div className="brand-feature">
                <div className="feature-icon">🔴</div>
                <span>Live Streaming HD</span>
              </div>
              <div className="brand-feature">
                <div className="feature-icon">📅</div>
                <span>Jadwal Lengkap</span>
              </div>
              <div className="brand-feature">
                <div className="feature-icon">🏆</div>
                <span>Semua Liga</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-wrapper">
          <div className="login-form-container">
            <div className="login-header">
              <h2 className="login-title">Masuk ke Akun</h2>
              <p className="login-subtitle">Masukkan email dan password Anda</p>
            </div>

            {error && (
              <div className="login-error">
                <Icon name="alert-circle" size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Masukkan Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Masukkan Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>


              <button
                type="submit"
                disabled={isLoading}
                className="login-button"
              >
                {isLoading ? (
                  <>
                    <div className="spinner-small"></div>
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  )
}
