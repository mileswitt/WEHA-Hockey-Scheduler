import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PublicNavbar from '../components/PublicNavbar'

export default function TeamPage() {
  const { teamID } = useParams()

  const [team,    setTeam]    = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [view,    setView]    = useState('grid')

  useEffect(() => {
    if (!teamID) return
    const id = parseInt(teamID)

    Promise.all([
      fetch('/api/localteams').then(r => r.json()),
      fetch(`/api/players/${id}`).then(r => r.json()),
    ])
    .then(([teams, playerList]) => {
      const foundTeam = teams.find(t => t.TeamID === id)
      setTeam(foundTeam)
      setPlayers(playerList)
      setLoading(false)
    })
    .catch(() => setLoading(false))
  }, [teamID])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f2b46' }}>
      <PublicNavbar />
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#aaa', fontSize: 18 }}>Loading team...</p>
      </div>
    </div>
  )

  if (!team) return (
    <div style={{ minHeight: '100vh', background: '#0f2b46' }}>
      <PublicNavbar />
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#c21537', fontSize: 18 }}>Team not found.</p>
      </div>
    </div>
  )

  const winPct = team.GamesPlayed > 0
    ? ((team.Wins / team.GamesPlayed) * 100).toFixed(0)
    : 0

  return (
    <div style={{ minHeight: '100vh', background: '#0f2b46', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <PublicNavbar />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Back link */}
        <Link to="/" style={{ color: '#93c5fd', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
          ← Back to home
        </Link>

        {/* Team header */}
        <div style={{
          background:   '#fff',
          borderRadius: 12,
          padding:      '28px 32px',
          marginBottom: 20,
          boxShadow:    '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {team.LeagueName && (
            <div style={{
              display:       'inline-block',
              background:    '#111',
              color:         '#fff',
              fontSize:      11,
              fontWeight:    700,
              letterSpacing: '0.1em',
              padding:       '4px 10px',
              borderRadius:  4,
              marginBottom:  10,
              textTransform: 'uppercase',
              fontFamily:    "'Barlow Condensed', sans-serif",
            }}>
              {team.LeagueName} {new Date().getFullYear()}
            </div>
          )}

          <h1 style={{
            fontFamily:    "'Barlow Condensed', sans-serif",
            fontSize:      42,
            fontWeight:    800,
            color:         '#111',
            margin:        '0 0 4px',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}>
            {team.Name}
          </h1>

          {team.DivisionName && (
            <p style={{ color: '#888', fontSize: 14, margin: '0 0 20px' }}>
              {team.DivisionName} · {team.LeagueName}
            </p>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32, borderTop: '1px solid #f0f0f0', paddingTop: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Wins',   value: team.Wins        },
              { label: 'Losses', value: team.Losses      },
              { label: 'Ties',   value: team.Ties        },
              { label: 'Games',  value: team.GamesPlayed },
              { label: 'Win %',  value: `${winPct}%`     },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize:   28,
                  fontWeight: 800,
                  color:      '#111',
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: '0.08em', marginTop: 4 }}>
                  {stat.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roster section */}
        <div style={{
          background:   '#fff',
          borderRadius: 12,
          padding:      '24px 28px',
          boxShadow:    '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {/* Roster header with view toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{
              fontFamily:    "'Barlow Condensed', sans-serif",
              fontSize:      20,
              fontWeight:    800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color:         '#111',
              display:       'flex',
              alignItems:    'center',
              gap:           8,
              margin:        0,
            }}>
              ROSTER
              <span style={{ fontSize: 13, fontWeight: 400, color: '#999', letterSpacing: '0.02em' }}>
                ({players.length} players)
              </span>
            </h2>

            {/* Grid / List toggle */}
            <div style={{
              display:      'flex',
              background:   '#111',
              borderRadius: 20,
              padding:      2,
              gap:          2,
            }}>
              {['grid', 'list'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    background:   view === v ? '#fff' : 'none',
                    border:       'none',
                    borderRadius: 18,
                    padding:      '6px 12px',
                    cursor:       'pointer',
                    fontSize:     14,
                    color:        view === v ? '#111' : '#fff',
                  }}
                >
                  {v === 'grid' ? '⊞' : '≡'}
                </button>
              ))}
            </div>
          </div>

          {/* Player cards */}
          {players.length === 0 ? (
            <p style={{ color: '#999', fontSize: 14 }}>No players found for this team.</p>
          ) : (
            <div style={{
              display:             'grid',
              gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(120px, 1fr))' : '1fr',
              gap:                 view === 'grid' ? 20 : 8,
            }}>
              {players.map(player => (
                <div key={player.PlayerID} style={{
                  display:       'flex',
                  flexDirection: view === 'grid' ? 'column' : 'row',
                  alignItems:    'center',
                  gap:           view === 'grid' ? 8 : 12,
                  padding:       view === 'list' ? '10px 14px' : 0,
                  background:    view === 'list' ? '#f9fafb' : 'none',
                  borderRadius:  view === 'list' ? 8 : 0,
                  border:        view === 'list' ? '0.5px solid #e5e7eb' : 'none',
                }}>
                  {/* Avatar circle with jersey number */}
                  <div style={{
                    width:          view === 'grid' ? 90 : 44,
                    height:         view === 'grid' ? 90 : 44,
                    borderRadius:   '50%',
                    background:     '#e5e7eb',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                    fontWeight:     700,
                    fontSize:       view === 'grid' ? 22 : 14,
                    color:          '#374151',
                  }}>
                    {player.JerseyNumber ? `#${player.JerseyNumber}` : '?'}
                  </div>

                  {/* Player name */}
                  <div style={{ textAlign: view === 'grid' ? 'center' : 'left', flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: '0.05em' }}>
                      {player.FirstName?.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>
                      {player.LastName?.toUpperCase()}
                    </div>
                    {view === 'list' && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {player.Position || 'N/A'} · {player.Goals ?? 0}G {player.Assists ?? 0}A
                      </div>
                    )}
                  </div>

                  {/* GP stat in list view */}
                  {view === 'list' && (
                    <div style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>
                      {player.GamesPlayed ?? 0} GP
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
