import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Ignore errors during initial loading/mounting
    if (error?.message?.includes('Cannot read properties of null')) {
      console.warn('Ignoring null reference during mount')
      this.setState({ hasError: false, error: null })
      return
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center',
          background: 'var(--bg)',
          color: 'var(--text)'
        }}>
          <div style={{
            maxWidth: '500px',
            padding: '32px',
            borderRadius: '12px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)'
          }}>
            <h2 style={{ marginBottom: '16px', color: 'var(--red)' }}>
              ⚠️ Oops! Terjadi Kesalahan
            </h2>
            <p style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>
              {this.state.error?.message || 'Terjadi kesalahan yang tidak terduga.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent)',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Refresh Halaman
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
