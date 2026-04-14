import { memo } from 'react'

const MatchFilters = memo(function MatchFilters({ 
  statusFilter, 
  setStatusFilter, 
  counts,
  leagueFilter,
  setLeagueFilter,
  leagues 
}) {
  return (
    <>
      {/* Main Tabs */}
      <div className="main-tabs">
        <button 
          onClick={() => setStatusFilter('live')} 
          className={statusFilter === 'live' ? 'active' : ''}
          aria-label={`Live matches: ${counts.live}`}
        >
          LIVE <span className="count">{counts.live}</span>
        </button>
        <button 
          onClick={() => setStatusFilter('upcoming')} 
          className={statusFilter === 'upcoming' ? 'active' : ''}
          aria-label={`Upcoming matches: ${counts.upcoming}`}
        >
          SCHEDULE <span className="count">{counts.upcoming}</span>
        </button>
        <button 
          onClick={() => setStatusFilter('finished')} 
          className={statusFilter === 'finished' ? 'active' : ''}
          aria-label={`Finished matches: ${counts.finished}`}
        >
          FINISHED <span className="count">{counts.finished}</span>
        </button>
      </div>

      {/* League Chips */}
      <div className="league-chips-scroll">
        <button
          className={`league-chip ${leagueFilter === 'all' ? 'active' : ''}`}
          onClick={() => setLeagueFilter('all')}
          aria-label="Show all leagues"
        >
          All Leagues
        </button>
        {leagues.filter(l => l !== 'all').map(l => (
          <button
            key={l}
            className={`league-chip ${leagueFilter === l ? 'active' : ''}`}
            onClick={() => setLeagueFilter(l)}
            aria-label={`Filter by ${l}`}
          >
            {l}
          </button>
        ))}
      </div>
    </>
  )
})

export default MatchFilters
