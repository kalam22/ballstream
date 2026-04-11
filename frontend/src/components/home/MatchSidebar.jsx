import { useState } from 'react'

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
