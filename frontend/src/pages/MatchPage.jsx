import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import TeamLogo from '../components/TeamLogo';
import { Spinner } from '../components/UI';
import { ErrorAlert } from '../components/Alert';
import { useCountdown, formatCountdown } from '../hooks/useCountdown';
import { swal } from '../utils/swal';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Flag, 
  Globe, 
  Video, 
  ArrowLeft,
  Clock,
  CheckCircle,
  Circle,
  Trophy
} from 'lucide-react';

const API_KEY = import.meta.env.VITE_API_KEY || '';
const fetchWithAuth = (url, options = {}) => {
  const headers = { ...options.headers };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  return fetch(url, { ...options, headers });
};

export default function MatchPage({ id }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  
  // Countdown for upcoming matches
  const countdown = useCountdown(match?.start_time);

  const loadMatch = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    
    const cached = sessionStorage.getItem(`match_${id}`);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setMatch(data);
        if (data.sources && data.sources.length > 0) {
          setSelectedStream(data.sources[0].embed_url);
        }
        setLoading(false);
        return;
      } catch {
        // Invalid cache — fetch fresh data
      }
    }
    
    fetchWithAuth(`/api/v1/match/${id}`)
      .then(r => {
        if (!r.ok) {
          if (r.status === 404) throw new Error('Pertandingan tidak ditemukan');
          throw new Error(`Error ${r.status}: Gagal memuat data`);
        }
        return r.json();
      })
      .then(response => {
        const data = response.success ? response.data : response;
        setMatch(data);
        if (data.sources && data.sources.length > 0) {
          setSelectedStream(data.sources[0].embed_url);
        }
        sessionStorage.setItem(`match_${id}`, JSON.stringify(data));
        setLoading(false);
      })
      .catch(async err => {
        setError(err);
        setLoading(false);
        // Show swal for network/server errors (not 404)
        if (!err.message?.includes('tidak ditemukan')) {
          await swal.error({
            title: 'Gagal Memuat Pertandingan',
            text: 'Terjadi gangguan saat mengambil data. Silakan coba lagi.',
          });
        }
      });
  };

  useEffect(() => {
    loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar activePage="home" />
        <main className="container main-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Spinner size="large" />
          </div>
        </main>
      </>
    );
  }

  if (error || !match) {
    return (
      <>
        <Navbar activePage="home" />
        <main className="container main-content">
          <ErrorAlert error={error || { message: 'Pertandingan tidak ditemukan' }} onRetry={loadMatch} />
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <a href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' }}>
              ← Kembali ke Beranda
            </a>
          </div>
        </main>
      </>
    );
  }

  const hScore = match.home_score ?? 0;
  const aScore = match.away_score ?? 0;

  return (
    <>
      <Navbar activePage="home" />
      <main className="container main-content">
        {/* Back Button */}
        <div style={{ marginBottom: '1.5rem' }}>
          <a href="/" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            color: 'var(--accent)', 
            textDecoration: 'none', 
            fontSize: '0.95rem', 
            fontWeight: '600',
            transition: 'var(--transition)',
            cursor: 'pointer'
          }}
          aria-label="Kembali ke beranda">
            <ArrowLeft size={20} />
            Kembali ke Beranda
          </a>
        </div>

        {/* Hero Card with Sporty Design */}
        <div style={{ 
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border)', 
          overflow: 'hidden',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          {/* Accent Bar */}
          <div style={{ 
            background: match.status === 'live' 
              ? 'linear-gradient(90deg, var(--red) 0%, #ff6b85 100%)'
              : 'linear-gradient(90deg, var(--accent) 0%, var(--blue) 100%)',
            padding: '0.35rem',
            animation: match.status === 'live' ? 'pulse 2s ease-in-out infinite' : 'none'
          }} />
          
          <div style={{ padding: '2.5rem 2rem' }}>
            {/* League Info - Sporty Header */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                {match.league_logo && (
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--bg-glass)',
                    borderRadius: 'var(--radius)',
                    border: '2px solid var(--border)'
                  }}>
                    <img src={match.league_logo} alt={match.league} style={{ width: '56px', height: '56px', display: 'block' }} onError={e => e.target.style.display='none'} />
                  </div>
                )}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    color: 'var(--text)', 
                    fontWeight: '800', 
                    letterSpacing: '-0.5px',
                    marginBottom: '0.25rem'
                  }}>
                    {match.league}
                    {match.league_country && match.league_flag && (
                      <img src={match.league_flag} alt={match.league_country} style={{ width: '28px', height: '20px', marginLeft: '0.75rem', verticalAlign: 'middle', borderRadius: '2px' }} onError={e => e.target.style.display='none'} />
                    )}
                  </div>
                  {(match.league_season || match.league_round) && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                      {match.league_season} {match.league_round && `• ${match.league_round}`}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ 
                fontSize: '1rem', 
                color: 'var(--text-soft)', 
                fontWeight: '600', 
                marginBottom: '0.75rem',
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <Calendar size={18} />
                {match.start_time}
              </div>
              
              {match.status_detail && (
                <div style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.5rem', 
                  background: match.status === 'live' 
                    ? 'linear-gradient(135deg, var(--red) 0%, #ff6b85 100%)' 
                    : match.status === 'finished'
                    ? 'linear-gradient(135deg, var(--slate-400) 0%, var(--slate-700) 100%)'
                    : countdown && countdown.expired
                    ? 'linear-gradient(135deg, var(--amber) 0%, #ffd666 100%)'
                    : 'linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)', 
                  color: '#0f172a', 
                  borderRadius: 'var(--radius-pill)', 
                  fontSize: '0.9rem', 
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: match.status === 'live' 
                    ? '0 4px 20px rgba(255,68,102,0.5)' 
                    : countdown && countdown.expired
                    ? '0 4px 20px rgba(255,204,68,0.4)'
                    : '0 4px 20px rgba(2,255,151,0.4)',
                  animation: match.status === 'live' ? 'pulse 2s ease-in-out infinite' : 'none'
                }}>
                  {match.status === 'live' && <Circle size={12} fill="currentColor" />}
                  {match.status === 'finished' 
                    ? <><CheckCircle size={16} /> Pertandingan Selesai</>
                    : countdown && countdown.expired
                    ? <><Trophy size={16} /> Pertandingan Dimulai</>
                    : match.status === 'upcoming' && countdown && !countdown.expired 
                    ? <><Clock size={16} /> {formatCountdown(countdown)}</> 
                    : match.status_detail}
                </div>
              )}
            </div>

            {/* Teams & Score - Stadium Style */}
            <div className="match-teams-score">
              {/* Background Pattern */}
              <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.03,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10px, var(--text) 10px, var(--text) 11px)',
                pointerEvents: 'none'
              }} />

              {/* Home Team */}
              <div className="match-team match-team-home">
                <div className="match-team-logo-wrap match-team-logo-home">
                  <TeamLogo team={match.home_team} size="md" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="match-team-name">
                    {match.home_team?.name}
                  </div>
                  {match.home_code && (
                    <div className="match-team-code">
                      {match.home_code}
                    </div>
                  )}
                </div>
              </div>

              {/* Score Block - Digital Scoreboard Style */}
              <div className="match-score-block">
                <div className="match-score-display">
                  <span>{hScore}</span>
                  <span className="match-score-colon">:</span>
                  <span>{aScore}</span>
                </div>
                
                {(match.score_period1 || match.score_period2 || match.score_period3 || match.score_period4 || match.score_penalty || match.injury_time1 || match.injury_time2) && (
                  <div className="match-score-periods">
                    {match.score_period1 && (
                      <span style={{ padding: '0.35rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        HT {match.score_period1}
                      </span>
                    )}
                    {match.score_period2 && (
                      <span style={{ padding: '0.35rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        FT {match.score_period2}
                      </span>
                    )}
                    {match.score_period3 && (
                      <span style={{ padding: '0.35rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        P3 {match.score_period3}
                      </span>
                    )}
                    {match.score_period4 && (
                      <span style={{ padding: '0.35rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        P4 {match.score_period4}
                      </span>
                    )}
                    {match.score_penalty && (
                      <span style={{ padding: '0.35rem 0.65rem', background: 'var(--red-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontWeight: '800', border: '1px solid var(--red)' }}>
                        PEN {match.score_penalty}
                      </span>
                    )}
                    {match.injury_time1 && (
                      <span style={{ padding: '0.35rem 0.65rem', background: 'var(--amber-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--amber)', border: '1px solid var(--amber)' }}>
                        +{match.injury_time1}'
                      </span>
                    )}
                    {match.injury_time2 && (
                      <span style={{ padding: '0.35rem 0.65rem', background: 'var(--amber-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--amber)', border: '1px solid var(--amber)' }}>
                        +{match.injury_time2}'
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="match-team match-team-away">
                <div className="match-team-logo-wrap match-team-logo-away">
                  <TeamLogo team={match.away_team} size="md" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="match-team-name">
                    {match.away_team?.name}
                  </div>
                  {match.away_code && (
                    <div className="match-team-code">
                      {match.away_code}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stream Selector - Sporty Buttons */}
            {match.sources && match.sources.length > 0 && (
              <>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginBottom: '2rem', 
                  flexWrap: 'wrap',
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius)',
                  border: '2px solid var(--border)'
                }}>
                  {match.sources.map((source, index) => (
                    <button
                      key={index}
                      onClick={async () => {
                        if (match.status === 'upcoming') {
                          await swal.info({
                            title: '⏳ Pertandingan Belum Dimulai',
                            text: 'Stream akan tersedia saat pertandingan dimulai.',
                          });
                          return;
                        }
                        setIframeLoading(true);
                        setSelectedStream(source.embed_url);
                      }}
                      aria-label={`Stream ${source.stream_no}${source.hd ? ' HD' : ''}${source.language ? ` ${source.language}` : ''}`}
                      style={{
                        padding: '1rem 1.75rem',
                        borderRadius: 'var(--radius)',
                        border: selectedStream === source.embed_url ? 'none' : '2px solid var(--border)',
                        background: selectedStream === source.embed_url 
                          ? 'linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)' 
                          : 'var(--bg-card)',
                        color: selectedStream === source.embed_url ? '#0f172a' : 'var(--text)',
                        fontSize: '1rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        fontFamily: 'var(--font-sans)',
                        boxShadow: selectedStream === source.embed_url 
                          ? '0 8px 24px rgba(2,255,151,0.3)' 
                          : 'none',
                        transform: selectedStream === source.embed_url ? 'translateY(-2px)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Video size={18} /> Stream {source.stream_no}
                        </span>
                        {source.hd && (
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            background: selectedStream === source.embed_url ? 'rgba(15,23,42,0.3)' : 'var(--blue)', 
                            color: selectedStream === source.embed_url ? '#0f172a' : 'var(--white)', 
                            borderRadius: 'var(--radius-sm)', 
                            fontSize: '0.7rem',
                            fontWeight: '800'
                          }}>
                            HD
                          </span>
                        )}
                        {source.language && (
                          <span style={{ 
                            fontSize: '0.85rem', 
                            opacity: 0.8,
                            fontWeight: '600'
                          }}>
                            [{source.language}]
                          </span>
                        )}
                        {source.source && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            opacity: 0.6,
                            fontWeight: '500'
                          }}>
                            ({source.source})
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Stream Container - Enhanced */}
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  paddingBottom: '56.25%', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: 'var(--radius-lg)', 
                  overflow: 'hidden',
                  border: '3px solid var(--border)',
                  boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                  marginBottom: '2rem'
                }}>
                  {iframeLoading && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)', 
                      zIndex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <Spinner size="large" />
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>
                        Memuat stream...
                      </div>
                    </div>
                  )}
                  {selectedStream && (
                    <iframe
                      src={selectedStream}
                      title="Live stream"
                      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
                      allowFullScreen
                      webkit-playsinline="true"
                      playsInline
                      referrerPolicy="no-referrer"
                      onLoad={() => setIframeLoading(false)}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                    />
                  )}
                </div>
              </>
            )}

            {/* No stream notice for finished/upcoming matches */}
            {(!match.sources || match.sources.length === 0) && match.status !== 'live' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.25rem 1.5rem',
                background: match.status === 'upcoming' ? 'var(--blue-dim)' : 'var(--bg-secondary)',
                border: `2px solid ${match.status === 'upcoming' ? 'var(--blue)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                marginBottom: '2rem',
                color: match.status === 'upcoming' ? 'var(--blue)' : 'var(--text-muted)',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}>
                <Video size={20} style={{ flexShrink: 0 }} />
                {match.status === 'upcoming'
                  ? 'Stream akan tersedia saat pertandingan dimulai.'
                  : 'Stream tidak tersedia untuk pertandingan ini.'}
              </div>
            )}

            {/* Match Info Grid - Sporty Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Venue Card */}
              {match.venue_stadium && (
                <div style={{ 
                  padding: '1.5rem', 
                  background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-glass) 100%)', 
                  borderRadius: 'var(--radius)', 
                  border: '2px solid var(--border)',
                  transition: 'var(--transition)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: '800', letterSpacing: '1.5px', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} /> Stadion
                  </div>
                  {match.venue_image && (
                    <img src={match.venue_image} alt={match.venue_stadium} style={{ 
                      width: '100%', 
                      height: '120px', 
                      objectFit: 'cover', 
                      borderRadius: 'var(--radius-sm)', 
                      marginBottom: '1rem',
                      border: '2px solid var(--border)'
                    }} onError={e => e.target.style.display='none'} />
                  )}
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text)' }}>
                    {match.venue_stadium}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} /> {match.venue_city}{match.venue_country && `, ${match.venue_country}`}
                  </div>
                  {match.venue_capacity > 0 && (
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-soft)', 
                      fontWeight: '600',
                      padding: '0.5rem',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      marginTop: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <Users size={14} /> Kapasitas: {match.venue_capacity.toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Referee Card */}
              {match.referee_name && (
                <div style={{ 
                  padding: '1.5rem', 
                  background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-glass) 100%)', 
                  borderRadius: 'var(--radius)', 
                  border: '2px solid var(--border)',
                  transition: 'var(--transition)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--blue)', fontWeight: '800', letterSpacing: '1.5px', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Flag size={14} /> Wasit
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    {match.referee_photo && (
                      <img src={match.referee_photo} alt={match.referee_name} style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '50%', 
                        border: '3px solid var(--blue)',
                        boxShadow: '0 4px 12px rgba(77,184,255,0.3)'
                      }} onError={e => e.target.style.display='none'} />
                    )}
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--text)' }}>
                        {match.referee_name}
                      </div>
                      {match.referee_country && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Globe size={14} /> {match.referee_country}
                        </div>
                      )}
                    </div>
                  </div>
                  {(match.referee_games > 0 || match.referee_yellow > 0 || match.referee_red > 0) && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      {match.referee_games > 0 && (
                        <div style={{ 
                          flex: '1 1 60px',
                          minWidth: 0,
                          padding: '0.75rem 0.5rem', 
                          background: 'var(--bg-card)', 
                          borderRadius: 'var(--radius-sm)', 
                          textAlign: 'center',
                          border: '1px solid var(--border)'
                        }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)' }}>{match.referee_games}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>Pertandingan</div>
                        </div>
                      )}
                      {match.referee_yellow > 0 && (
                        <div style={{ 
                          flex: '1 1 60px',
                          minWidth: 0,
                          padding: '0.75rem 0.5rem', 
                          background: 'var(--amber-dim)', 
                          borderRadius: 'var(--radius-sm)', 
                          textAlign: 'center',
                          border: '1px solid var(--amber)'
                        }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '14px', height: '18px', background: '#fbbf24', borderRadius: '2px', flexShrink: 0 }} /> {match.referee_yellow}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--amber)', fontWeight: '600' }}>Kuning</div>
                        </div>
                      )}
                      {match.referee_red > 0 && (
                        <div style={{ 
                          flex: '1 1 60px',
                          minWidth: 0,
                          padding: '0.75rem 0.5rem', 
                          background: 'var(--red-dim)', 
                          borderRadius: 'var(--radius-sm)', 
                          textAlign: 'center',
                          border: '1px solid var(--red)'
                        }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '14px', height: '18px', background: '#ef4444', borderRadius: '2px', flexShrink: 0 }} /> {match.referee_red}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--red)', fontWeight: '600' }}>Merah</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Managers Section */}
            {(match.manager_home_name || match.manager_away_name) && (
              <div style={{ 
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                border: '2px solid var(--border)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '2rem',
                  flexWrap: 'wrap'
                }}>
                {match.manager_home_name && (
                  <div style={{ textAlign: 'center', flex: '1 1 200px', maxWidth: '280px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: '800', letterSpacing: '1.5px', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Users size={14} /> Pelatih Home
                    </div>
                    {match.manager_home_photo && (
                      <img src={match.manager_home_photo} alt={match.manager_home_name} style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%', 
                        marginBottom: '1rem',
                        border: '3px solid var(--accent)',
                        boxShadow: '0 4px 16px rgba(2,255,151,0.3)',
                        display: 'block',
                        margin: '0 auto 1rem'
                      }} onError={e => e.target.style.display='none'} />
                    )}
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--text)' }}>
                      {match.manager_home_name}
                    </div>
                    {match.manager_home_country && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Globe size={14} /> {match.manager_home_country}
                      </div>
                    )}
                  </div>
                )}
                {match.manager_away_name && (
                  <div style={{ textAlign: 'center', flex: '1 1 200px', maxWidth: '280px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--blue)', fontWeight: '800', letterSpacing: '1.5px', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Users size={14} /> Pelatih Away
                    </div>
                    {match.manager_away_photo && (
                      <img src={match.manager_away_photo} alt={match.manager_away_name} style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%', 
                        marginBottom: '1rem',
                        border: '3px solid var(--blue)',
                        boxShadow: '0 4px 16px rgba(77,184,255,0.3)',
                        display: 'block',
                        margin: '0 auto 1rem'
                      }} onError={e => e.target.style.display='none'} />
                    )}
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--text)' }}>
                      {match.manager_away_name}
                    </div>
                    {match.manager_away_country && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Globe size={14} /> {match.manager_away_country}
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}



            {/* Detail Unavailable Message */}
            {match.detail_unavailable && match.detail_message && (
              <div style={{ 
                marginTop: '2rem', 
                padding: '1.25rem', 
                background: 'var(--amber-dim)', 
                border: '2px solid var(--amber)', 
                borderRadius: 'var(--radius)', 
                color: 'var(--text)', 
                fontSize: '0.95rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                <span>{match.detail_message}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
