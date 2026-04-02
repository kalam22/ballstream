import { useState, useMemo } from 'react'
import Navbar from '../components/Navbar.jsx'
import MatchRow from '../components/MatchRow.jsx'
import { SkeletonGrid, Notice, EmptyState } from '../components/UI.jsx'
import { SearchIcon } from '../components/Icons.jsx'
import { useData } from '../context/DataContext.jsx'
import { useMatches, useDebounce } from '../hooks/useApi.js'
import { formatDate } from '../utils/format.js'
import { 
  Trophy, 
  Calendar, 
  TrendingUp, 
  Search,
  RefreshCw,
  AlertCircle,
  Inbox
} from 'lucide-react'

const STATUS_ORDER = { live: 1, upcoming: 2, finished: 3 }
const today = formatDate(new Date())

function CompactMatchCard({ match }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const parts = (match.start_time || '').split(' ')
  const dateStr = parts.length >= 3 ? `${parts[1]?.toUpperCase()} ${parts[0]}` : match.start_time
  const hScore = match.home_score ?? 0
  const aScore = match.away_score ?? 0
  const hWon = hScore > aScore
  const aWon = aScore > hScore

  return (
    <a href={`/match/${encodeURIComponent(match.id)}`} className="compact-card">
      <div className="cc-header">
        <span className="cc-league" title={match.league}>{match.league || '—'}</span>
        <span className="cc-date">{dateStr}</span>
      </div>
      <div className="cc-body">
        <div className="cc-row">
          <div className="cc-team-left">
            <div style={{ position: 'relative', width: '24px', height: '24px' }}>
              {!imageLoaded && (
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '50%',
                  animation: 'shimmer 1.5s infinite'
                }} />
              )}
              <img 
                src={match.home_team?.logo} 
                alt={match.home_team?.name || 'Home team'} 
                className="cc-logo" 
                width="24"
                height="24"
                loading="lazy"
                style={{ display: imageLoaded ? 'block' : 'none' }}
                onLoad={() => setImageLoaded(true)}
                onError={e => e.target.style.display='none'} 
              />
            </div>
            <span className="cc-name" title={match.home_team?.name}>{match.home_team?.name}</span>
          </div>
          <span className={`cc-score ${hWon ? 'win' : ''}`}>{hScore}</span>
        </div>
        <div className="cc-row">
          <div className="cc-team-left">
            <div style={{ position: 'relative', width: '24px', height: '24px' }}>
              {!imageLoaded && (
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '50%',
                  animation: 'shimmer 1.5s infinite'
                }} />
              )}
              <img 
                src={match.away_team?.logo} 
                alt={match.away_team?.name || 'Away team'} 
                className="cc-logo" 
                width="24"
                height="24"
                loading="lazy"
                style={{ display: imageLoaded ? 'block' : 'none' }}
                onLoad={() => setImageLoaded(true)}
                onError={e => e.target.style.display='none'} 
              />
            </div>
            <span className="cc-name" title={match.away_team?.name}>{match.away_team?.name}</span>
          </div>
          <span className={`cc-score ${aWon ? 'win' : ''}`}>{aScore}</span>
        </div>
      </div>
    </a>
  )
}

export default function HomePage() {
  const { sports, refreshCfg } = useData()
  const { matches, loading, error, countdown } = useMatches(refreshCfg.matchesSeconds * 1000)

  const [statusFilter, setStatusFilter] = useState('upcoming')
  const [activeSport, setActiveSport]   = useState(() => {
    try { return localStorage.getItem('ks-sport') || 'all' } catch { return 'all' }
  })
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
        if (activeSport !== 'all' && m.sport_id !== activeSport) return false
        if (leagueFilter !== 'all' && m.league !== leagueFilter) return false
        if (searchQuery) {
          const hay = `${m.home_team?.name ?? ''} ${m.away_team?.name ?? ''} ${m.league ?? ''}`.toLowerCase()
          if (!hay.includes(searchQuery.toLowerCase())) return false
        }
        return true
      })
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
  , [matches, statusFilter, activeSport, leagueFilter, searchQuery])

  const finishedMatches = useMemo(() => {
    return matches.filter(m => m.status === 'finished').slice(0, 15)
  }, [matches])

  const handleSport = (id) => {
    setActiveSport(id)
    try { localStorage.setItem('ks-sport', id) } catch {}
  }

  const allSports = [{ id: 'all', name: 'Semua', icon: <Trophy size={16} /> }, ...sports]

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

        {/* Main Tabs */}
        <div className="main-tabs">
          <button onClick={() => setStatusFilter('live')} className={statusFilter === 'live' ? 'active' : ''}>
            LIVE <span className="count">{counts.live}</span>
          </button>
          <button onClick={() => setStatusFilter('upcoming')} className={statusFilter === 'upcoming' ? 'active' : ''}>
            SCHEDULE <span className="count">{counts.upcoming}</span>
          </button>
          <button onClick={() => setStatusFilter('finished')} className={statusFilter === 'finished' ? 'active' : ''}>
            FINISHED <span className="count">{counts.finished}</span>
          </button>
        </div>

        {/* League Chips */}
        <div className="league-chips-scroll">
          <button
            className={`league-chip ${leagueFilter === 'all' ? 'active' : ''}`}
            onClick={() => setLeagueFilter('all')}
          >
            All Leagues
          </button>
          {leagues.filter(l => l !== 'all').map(l => (
            <button
              key={l}
              className={`league-chip ${leagueFilter === l ? 'active' : ''}`}
              onClick={() => setLeagueFilter(l)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <div className="search-wrap">
            <SearchIcon />
            <input
              type="search"
              className="search-input"
              placeholder="Cari tim atau liga..."
              value={searchRaw}
              onChange={e => setSearchRaw(e.target.value)}
              aria-label="Cari pertandingan"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Match Grid & Sidebar Layout */}
        <div className="home-layout">
          {/* LATEST RESULTS SIDEBAR */}
          <aside className="home-sidebar left-sidebar">
            <h3 className="sidebar-title">
              <span className="green-bar"></span>LATEST RESULTS
            </h3>
            {finishedMatches.length > 0 ? (
              <div className="compact-list">
                {finishedMatches.map(m => <CompactMatchCard key={m.id} match={m} />)}
              </div>
            ) : (
              <div className="empty-sidebar">Belum ada hasil pertandingan.</div>
            )}
          </aside>

          {/* MAIN LIST */}
          <div className="home-main">
            {error ? (
              <div style={{ 
                padding: '3rem 2rem', 
                textAlign: 'center', 
                background: 'var(--bg-card)', 
                borderRadius: 'var(--radius-lg)', 
                border: '2px solid var(--border)' 
              }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '64px', 
                  height: '64px', 
                  background: 'var(--red-dim)', 
                  borderRadius: '50%', 
                  marginBottom: '1.5rem' 
                }}>
                  <AlertCircle size={32} color="var(--red)" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text)' }}>
                  Jadwal Belum Bisa Dimuat
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  Terjadi gangguan saat mengambil data. Coba refresh beberapa saat lagi.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'var(--accent)',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.target.style.transform = 'translateY(0)'}
                >
                  <RefreshCw size={18} />
                  Coba Lagi
                </button>
              </div>
            ) : loading ? (
              <SkeletonGrid count={6} />
            ) : filtered.length === 0 ? (
              <div style={{ 
                padding: '3rem 2rem', 
                textAlign: 'center', 
                background: 'var(--bg-card)', 
                borderRadius: 'var(--radius-lg)', 
                border: '2px solid var(--border)' 
              }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '64px', 
                  height: '64px', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '50%', 
                  marginBottom: '1.5rem' 
                }}>
                  <Inbox size={32} color="var(--text-muted)" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text)' }}>
                  Tidak Ada Pertandingan
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  Coba ubah filter atau kata kunci pencarian.
                </p>
              </div>
            ) : (
              <div className="league-grouped-list">
                {Object.entries(
                  filtered.reduce((acc, m) => {
                    const l = m.league || 'Lainnya'
                    if (!acc[l]) acc[l] = []
                    acc[l].push(m)
                    return acc
                  }, {})
                )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([leagueName, leagueMatches]) => (
                  <div key={leagueName} className="league-group">
                    <h2 className="league-header">{leagueName.toUpperCase()}</h2>
                    <div className="league-matches">
                      {leagueMatches.map((m, i) => (
                        <MatchRow key={m.id} match={m} idx={i} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
