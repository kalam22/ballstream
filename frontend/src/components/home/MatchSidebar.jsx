import { useState, memo } from 'react'

// Separate image state per logo to avoid one load event affecting the other
function TeamLogoSmall({ src, alt }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div style={{ position: 'relative', width: '24px', height: '24px', flexShrink: 0 }}>
      {!loaded && (
        <div style={{ 
          position: 'absolute', inset: 0,
          background: 'var(--bg-secondary)', 
          borderRadius: '50%',
          animation: 'shimmer 1.5s infinite'
        }} />
      )}
      <img 
        src={src}
        alt={alt}
        className="cc-logo"
        width="24"
        height="24"
        loading="lazy"
        decoding="async"
        style={{ display: loaded ? 'block' : 'none' }}
        onLoad={() => setLoaded(true)}
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
    </div>
  )
}

const CompactMatchCard = memo(function CompactMatchCard({ match }) {
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
            <TeamLogoSmall src={match.home_team?.logo} alt={match.home_team?.name || 'Home team'} />
            <span className="cc-name" title={match.home_team?.name}>{match.home_team?.name}</span>
          </div>
          <span className={`cc-score ${hWon ? 'win' : ''}`}>{hScore}</span>
        </div>
        <div className="cc-row">
          <div className="cc-team-left">
            <TeamLogoSmall src={match.away_team?.logo} alt={match.away_team?.name || 'Away team'} />
            <span className="cc-name" title={match.away_team?.name}>{match.away_team?.name}</span>
          </div>
          <span className={`cc-score ${aWon ? 'win' : ''}`}>{aScore}</span>
        </div>
      </div>
    </a>
  )
})

export default function MatchSidebar({ finishedMatches }) {
  return (
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
  )
}
