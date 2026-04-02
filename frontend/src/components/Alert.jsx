import { Icon } from './Icons.jsx'

export function Alert({ type = 'info', title, message, onClose }) {
  const icons = {
    error: 'alert-circle',
    warning: 'alert-triangle',
    success: 'check-circle',
    info: 'info'
  }

  return (
    <div className={`alert alert-${type}`} role="alert">
      <div className="alert-icon">
        <Icon name={icons[type]} size={20} />
      </div>
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-message">{message}</div>
      </div>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Tutup">
          <Icon name="x" size={18} />
        </button>
      )}
    </div>
  )
}

export function ErrorAlert({ error, onRetry }) {
  if (!error) return null

  const message = error.message || 'Terjadi kesalahan yang tidak diketahui'
  
  return (
    <div className="error-alert-container">
      <Alert
        type="error"
        title="Gagal Memuat Data"
        message={message}
      />
      {onRetry && (
        <button className="retry-button" onClick={onRetry}>
          <Icon name="refresh-cw" size={16} />
          Coba Lagi
        </button>
      )}
    </div>
  )
}
