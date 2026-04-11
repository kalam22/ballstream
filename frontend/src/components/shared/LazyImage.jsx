import { useState } from 'react'

/**
 * LazyImage - Progressive image loading with blur placeholder
 * Mobile-first, performance-optimized image component
 */
export default function LazyImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '',
  style = {},
  onLoad,
  onError 
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const handleLoad = (e) => {
    setLoaded(true)
    onLoad?.(e)
  }

  const handleError = (e) => {
    setError(true)
    onError?.(e)
  }

  if (error) {
    return (
      <div
        className={`lazy-image-placeholder ${className}`}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-secondary)',
          borderRadius: '50%',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: 'var(--text-muted)',
          ...style
        }}
      >
        {alt?.charAt(0)?.toUpperCase() || '?'}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      {/* Blur placeholder */}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--bg-secondary)',
            borderRadius: '50%',
            animation: 'shimmer 1.5s infinite'
          }}
        />
      )}
      
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={className}
        style={{
          ...style,
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          display: 'block'
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}
