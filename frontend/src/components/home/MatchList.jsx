import { memo, useMemo } from 'react'
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react'
import { SkeletonGrid } from '../UI'
import MatchRow from '../MatchRow'

// Group and sort matches by league — memoized to avoid re-computation on every render
function useGroupedMatches(filtered) {
  return useMemo(() => {
    const grouped = {}
    for (const m of filtered) {
      const l = m.league || 'Lainnya'
      if (!grouped[l]) grouped[l] = []
      grouped[l].push(m)
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])
}

const LeagueGroup = memo(function LeagueGroup({ leagueName, leagueMatches }) {
  return (
    <div className="league-group">
      <h2 className="league-header">{leagueName.toUpperCase()}</h2>
      <div className="league-matches">
        {leagueMatches.map((m, i) => (
          <MatchRow key={m.id} match={m} idx={i} />
        ))}
      </div>
    </div>
  )
})

export default function MatchList({ error, loading, filtered }) {
  const groupedMatches = useGroupedMatches(filtered)

  if (error) {
    return (
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
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <RefreshCw size={18} />
          Coba Lagi
        </button>
      </div>
    )
  }

  if (loading) {
    return <SkeletonGrid count={6} />
  }

  if (filtered.length === 0) {
    return (
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
    )
  }

  return (
    <div className="league-grouped-list">
      {groupedMatches.map(([leagueName, leagueMatches]) => (
        <LeagueGroup key={leagueName} leagueName={leagueName} leagueMatches={leagueMatches} />
      ))}
    </div>
  )
}
