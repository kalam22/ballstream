import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeCtx = createContext({ theme: 'dark', toggle: () => {} })

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeCtx)
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('ks-theme')
      if (saved === 'dark' || saved === 'light') return saved
    } catch {
      // localStorage unavailable — fall back to system preference
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('ks-theme', theme) } catch { /* ignore quota errors */ }
  }, [theme])

  const toggle = useCallback(() =>
    setTheme(t => (t === 'dark' ? 'light' : 'dark')), [])

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}
