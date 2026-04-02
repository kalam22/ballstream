import { Icon } from '../components/Icons.jsx'

export default function NotFoundPage() {
  return (
    <div className="error-page">
      <div className="error-content">
        <div className="error-icon">
          <Icon name="alert-circle" size={64} />
        </div>
        <h1 className="error-title">404</h1>
        <p className="error-message">Halaman tidak ditemukan</p>
        <p className="error-description">
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
        <a href="/" className="error-button">
          <Icon name="home" size={18} />
          Kembali ke Beranda
        </a>
      </div>
    </div>
  )
}
