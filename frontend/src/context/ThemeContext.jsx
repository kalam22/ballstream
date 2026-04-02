import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeCtx = createContext({ theme: 'dark', toggle: () => {} })

export function useTheme() {
  return useContext(ThemeCtx)
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('ks-theme')
      if (saved === 'dark' || saved === 'light') return saved
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('ks-theme', theme) } catch {}
  }, [theme])

  const toggle = useCallback(() =>
    setTheme(t => (t === 'dark' ? 'light' : 'dark')), [])

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}
