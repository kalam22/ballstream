import { memo } from 'react'
import { STATUS_MAP } from '../utils/format.js'
import TeamLogo from './TeamLogo.jsx'

const MatchRow = memo(function MatchRow({ match, idx = 0 }) {
  const isUpcoming = match.status === 'upcoming'
  const state = STATUS_MAP[match.status] ?? { label: match.status || '?', cls: '' }
  const hasScore = match.home_score != null

  const parts = (match.start_time || '').split(' ')
  let timeStr = '—', dateStr = ''
  if (parts.length >= 3) {
    dateStr = `${parts[1]?.toUpperCase()} ${parts[0]}`
    timeStr = parts[2]
  } else {
    dateStr = match.start_time
  }

  // Stable style object — avoids new object allocation on every render
  const rowStyle = idx > 0 ? { animationDelay: `${idx * 45}ms` } : undefined

  return (
    <a
      href={`/match/${encodeURIComponent(match.id)}`}
      className={`match-row ${state.cls}`}
      style={rowStyle}
    >
      <div className="mr-left">
        <span className="mr-name" title={match.home_team?.name}>{match.home_team?.name ?? '—'}</span>
        <TeamLogo team={match.home_team ?? {}} size="sm" />
      </div>

      <div className="mr-center">
        <span className="mr-vs">{hasScore ? `${match.home_score} - ${match.away_score}` : 'VS'}</span>
        <span className="mr-date">{dateStr}</span>
        <span className="mr-time">{timeStr}</span>
        <span className={`mr-status ${state.cls}`}>{state.label}</span>
      </div>

      <div className="mr-right">
        <TeamLogo team={match.away_team ?? {}} size="sm" />
        <span className="mr-name" title={match.away_team?.name}>{match.away_team?.name ?? '—'}</span>
      </div>
    </a>
  )
})

export default MatchRow
