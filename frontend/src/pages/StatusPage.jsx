import Navbar from '../components/Navbar.jsx'
import { SkeletonGrid, Notice, ProgressBar } from '../components/UI.jsx'
import { useData } from '../context/DataContext.jsx'
import { useUpstreams } from '../hooks/useApi.js'

function formatTimestamp(timestamp) {
  if (!timestamp) return '—';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;
    
    // Format: "30 Mar 2026, 13:20"
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch (error) {
    return timestamp;
  }
}

function UpstreamCard({ item }) {
  const ratio = item.total_requests ? item.failures / item.total_requests : 0
  let health = 'Healthy', hCls = 'ok'
  if (item.circuit_state === 'open') { health = 'Circuit Open'; hCls = 'err' }
  else if (ratio >= 0.5)             { health = 'Risky';        hCls = 'err' }
  else if (ratio >= 0.1)             { health = 'Degraded';     hCls = 'warn' }
  else if (ratio > 0)                { health = 'Warning';      hCls = 'info' }

  const metrics = [
    ['Requests',    item.total_requests       || 0],
    ['Success',     item.successes            || 0],
    ['Failures',    item.failures             || 0],
    ['Status',      item.last_status_code     || '—'],
    ['Consec.',     item.consecutive_failures || 0],
    ['Circuit',     item.circuit_state        || 'closed'],
  ]

  const meta = [
    ['Last used',    formatTimestamp(item.last_used_at)],
    ['Last success', formatTimestamp(item.last_success_at)],
    ['Open until',   formatTimestamp(item.open_until)],
    ['Last error',   item.last_error],
  ].filter(([, v]) => v && v !== '—')

  return (
    <div className="upstream-card">
      <div className="upstream-head">
        <span className="upstream-name">{item.name}</span>
        <span className={`upstream-badge ${hCls}`}>{health}</span>
      </div>
      <p className="upstream-url">{item.base_url || '—'}</p>
      <div className="upstream-metrics">
        {metrics.map(([label, val]) => (
          <div key={label} className="u-metric">
            <span className="u-label">{label}</span>
            <span className="u-val">{String(val)}</span>
          </div>
        ))}
      </div>
      {meta.length > 0 && (
        <div className="upstream-meta">
          {meta.map(([k, v]) => (
            <p key={k}><strong>{k}: </strong>{v}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StatusPage() {
  const { account, sports } = useData()
  const { upstreams, error: upErr } = useUpstreams()

  const ratio     = account ? account.usage_today / (account.daily_limit || 1) : 0
  const remaining = account ? account.daily_limit - account.usage_today : null

  return (
    <>
      <Navbar activePage="status" countdown={null} />

      <main className="container main-content">
        <section className="status-hero">
          <p className="eyebrow">Observability</p>
          <h1>Status API</h1>
          <p className="hero-sub">Pantau kuota dan ketersediaan layanan real-time.</p>
        </section>

        {/* Account & Quota */}
        <h2 className="section-title">Akun &amp; Kuota</h2>
        {account ? (
          <div className="status-card">
            {[
              ['Plan', <span key="plan" className="plan-tag">{account.plan?.toUpperCase()}</span>],
              ['Penggunaan', (
                <div key="usage" className="usage-row">
                  <ProgressBar ratio={ratio} />
                  <span>{account.usage_today} / {account.daily_limit}</span>
                </div>
              )],
              ['Sisa Request', `${remaining} requests`],
              ['Reset Dalam',  account.reset_at  || '—'],
              ['Sumber Aktif', `${account.source_count || 1}${account.partial ? ' (partial)' : ''}`],
            ].map(([label, val]) => (
              <div key={label} className="status-row">
                <span className="status-label">{label}</span>
                <span className="status-value">{val}</span>
              </div>
            ))}
          </div>
        ) : (
          <Notice type="info">Memuat data akun...</Notice>
        )}

        {/* Sports */}
        <h2 className="section-title">Sports Tersedia</h2>
        {sports.length === 0 ? (
          <SkeletonGrid count={4} height={64} />
        ) : (
          <div className="sports-grid">
            {sports.map(s => (
              <div key={s.id} className="sport-badge">
                {`${s.icon || ''} ${s.name}`.trim()}
              </div>
            ))}
          </div>
        )}

        {/* Upstreams */}
        <h2 className="section-title">Upstream Load Balancer</h2>
        {upErr ? (
          <Notice type="error">{upErr}</Notice>
        ) : upstreams.length === 0 ? (
          <SkeletonGrid count={2} height={160} />
        ) : (
          <div className="upstream-grid">
            {upstreams.map(u => (
              <UpstreamCard key={u.name} item={u} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
