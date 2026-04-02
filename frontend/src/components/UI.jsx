export function Card({ children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  )
}

export function Button({ children, variant = 'primary', onClick, className = '' }) {
  return (
    <button 
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function Spinner({ size = 'medium' }) {
  return (
    <div className={`spinner spinner-${size}`} role="status" aria-label="Memuat...">
      <div className="spinner-circle"></div>
    </div>
  )
}

export function SkeletonGrid({ count = 6, height = 170 }) {
  return (
    <div className="matches-grid" aria-busy="true" aria-label="Memuat pertandingan...">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card" style={{ height }} />
      ))}
    </div>
  )
}

export function Notice({ type = 'error', title, children }) {
  return (
    <div className={`notice ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {title && <strong>{title}</strong>}
      {children && <p>{children}</p>}
    </div>
  )
}

export function EmptyState({ icon = '🏟️', title, subtitle }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}

export function ProgressBar({ ratio }) {
  const cls = ratio >= 0.9 ? 'err' : ratio >= 0.7 ? 'warn' : ''
  return (
    <div className="progress-track">
      <div
        className={`progress-fill ${cls}`}
        style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        role="progressbar"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
