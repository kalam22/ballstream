import { Icon } from '../components/Icons.jsx'

export default function ErrorPage() {
  const error = window.__routeError || {}
  
  return (
    <div className="error-page">
      <div className="error-content">
        <div className="error-icon">
          <Icon name="alert-triangle" size={64} />
        </div>
        <h1 className="error-title">Oops!</h1>
        <p className="error-message">Terjadi kesalahan</p>
        <p className="error-description">
          {error?.statusText || error?.message || 'Terjadi kesalahan yang tidak diketahui'}
        </p>
        <div className="error-actions">
          <a href="/" className="error-button">
            <Icon name="home" size={18} />
            Kembali ke Beranda
          </a>
          <button className="error-button-secondary" onClick={() => window.location.reload()}>
            <Icon name="refresh-cw" size={18} />
            Muat Ulang
          </button>
        </div>
      </div>
    </div>
  )
}
