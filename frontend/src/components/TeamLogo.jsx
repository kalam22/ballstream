import { useState, memo } from 'react'

const TeamLogo = memo(function TeamLogo({ team, size = 'md' }) {
  const [errored, setErrored] = useState(false)
  const cls = `team-logo${size === 'sm' ? ' sm' : ''}`
  const phCls = `team-logo-placeholder${size === 'sm' ? ' sm' : ''}`
  const dimension = size === 'sm' ? 32 : 48

  if (team?.logo && !errored) {
    return (
      <img
        src={team.logo}
        alt={team.name || 'Team'}
        className={cls}
        width={dimension}
        height={dimension}
        loading="lazy"
        onError={() => setErrored(true)}
      />
    )
  }
  return (
    <div className={phCls} aria-label={team?.name || 'Team'}>
      {(team?.name || '?')[0]}
    </div>
  )
})

export default TeamLogo
