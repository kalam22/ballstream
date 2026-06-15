import { useState, useMemo } from 'react'
import Navbar from '../components/Navbar.jsx'
import MatchFilters from '../components/home/MatchFilters.jsx'
import MatchSearch from '../components/home/MatchSearch.jsx'
import MatchList from '../components/home/MatchList.jsx'
import MatchSidebar from '../components/home/MatchSidebar.jsx'
import { useData } from '../context/DataContext.jsx'
import { useMatches, useDebounce } from '../hooks/useApi.js'
import { formatDate } from '../utils/format.js'

const STATUS_ORDER = { live: 1, upcoming: 2, finished: 3 }
const today = formatDate(new Date())

export default function HomePage() {
  const { refreshCfg } = useData()
  const { matches, loading, error, countdown } = useMatches(refreshCfg.matchesSeconds * 1000)

  const [statusFilter, setStatusFilter] = useState('upcoming')
  const [leagueFilter, setLeagueFilter] = useState('all')
  const [searchRaw, setSearchRaw]       = useState('')
  const searchQuery = useDebounce(searchRaw, 250)

  const leagues = useMemo(() => {
    const all = [...new Set(matches.map(m => m.league).filter(Boolean))].sort()
    return ['all', ...all]
  }, [matches])

  const counts = useMemo(() => ({
    live: matches.filter(m => m.status === 'live').length,
    upcoming: matches.filter(m => m.status === 'upcoming').length,
    finished: matches.filter(m => m.status === 'finished').length,
  }), [matches])

  const filtered = useMemo(() =>
    matches
      .filter(m => {
        if (statusFilter !== 'all' && m.status !== statusFilter) return false
        if (leagueFilter !== 'all' && m.league !== leagueFilter) return false
        if (searchQuery) {
          const hay = `${m.home_team?.name ?? ''} ${m.away_team?.name ?? ''} ${m.league ?? ''}`.toLowerCase()
          if (!hay.includes(searchQuery.toLowerCase())) return false
        }
        return true
      })
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
  , [matches, statusFilter, leagueFilter, searchQuery])

  const finishedMatches = useMemo(() => {
    return matches.filter(m => m.status === 'finished').slice(0, 15)
  }, [matches])

  return (
    <>
      <Navbar activePage="home" countdown={countdown} />

      <main className="container main-content" id="main-content">
        {/* Hero */}
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Live Match Center</p>
            <h1>{statusFilter === 'finished' ? 'LATEST RESULT' : 'Jadwal Pertandingan'}</h1>
            <p className="hero-sub">Pantau pertandingan live, upcoming, dan hasil dari satu dashboard.</p>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-label">Hari Ini</span>
              <span className="stat-value">{today}</span>
            </div>
            <div className="hero-stat">
              <span className="stat-label">Pertandingan</span>
              <span className="stat-value">{loading ? '—' : matches.length}</span>
            </div>
          </div>
        </section>

        {/* Filters & Search */}
        <MatchFilters 
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          counts={counts}
          leagueFilter={leagueFilter}
          setLeagueFilter={setLeagueFilter}
          leagues={leagues}
        />

        <MatchSearch 
          searchRaw={searchRaw}
          setSearchRaw={setSearchRaw}
        />

        {/* Match Grid & Sidebar Layout */}
        <div className="home-layout">
          <MatchSidebar finishedMatches={finishedMatches} />
          
          <div className="home-main">
            <MatchList 
              error={error}
              loading={loading}
              filtered={filtered}
            />
          </div>
        </div>
      </main>
    </>
  )
}
