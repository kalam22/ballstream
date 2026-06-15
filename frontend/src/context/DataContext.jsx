import { createContext, useContext, useState, useEffect } from 'react'
import { fetchWithAuth } from '../utils/api'

const DataCtx = createContext({
  account: null,
  sports: [],
  refreshCfg: { matchesSeconds: 600, accountSeconds: 300, sportsSeconds: 3600 },
})

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  return useContext(DataCtx)
}

export function DataProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [sports, setSports] = useState([])
  const [refreshCfg, setRefreshCfg] = useState({
    matchesSeconds: 600,
    accountSeconds: 300,
    sportsSeconds: 3600,
  })

  // Bootstrap: fetch account + sports + refresh config in one shot
  useEffect(() => {
    fetchWithAuth('/api/v1/bootstrap')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(response => {
        // Handle new response format with success/data
        const data = response.success ? response.data : response
        if (data?.refresh) {
          setRefreshCfg({
            matchesSeconds: data.refresh.matches_seconds || 600,
            accountSeconds: data.refresh.account_seconds || 300,
            sportsSeconds:  data.refresh.sports_seconds  || 3600,
          })
        }
        if (data?.account?.plan) setAccount(data.account)
        if (Array.isArray(data?.sports)) setSports(data.sports)
      })
      .catch(() => {/* silently fail — individual endpoints will retry */})
  }, [])

  // Periodic account refresh
  useEffect(() => {
    const id = setInterval(() => {
      fetchWithAuth('/api/v1/account')
        .then(r => r.json())
        .then(response => { 
          // Handle new response format with success/data
          const d = response.success ? response.data : response
          if (d?.plan) setAccount(d) 
        })
        .catch(() => {})
    }, refreshCfg.accountSeconds * 1000)
    return () => clearInterval(id)
  }, [refreshCfg.accountSeconds])

  return (
    <DataCtx.Provider value={{ account, sports, refreshCfg }}>
      {children}
    </DataCtx.Provider>
  )
}
