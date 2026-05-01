// src/pages/TeamPage.jsx
// Team profile page — shows team info, roster, and games
// Uses local DB routes for accurate Losses field
// Route: /team/:teamID
// Team profile page — roster + stats tabs
// Mobile responsive team profile page — roster + stats tabs

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function TeamPage() {
  const { teamID } = useParams()

  const [team,     setTeam]     = useState(null)
  const [players,  setPlayers]  = useState([])
  const [tab,      setTab]      = useState('roster')
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState('grid')
  const [sortBy,   setSortBy]   = useState('Points')
  const [sortDir,  setSortDir]  = useState('desc')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!teamID) return
    const id = parseInt(teamID)
    Promise.all([
      fetch(`${API}/api/localteams`).then(r => r.json()),
      fetch(`${API}/api/players/${id}`).then(r => r.json()),
    ])
    .then(([teams, players]) => {
      setTeam(teams.find(t => t.TeamID === id))
      setPlayers(players)
      setLoading(false)
    })
    .catch(() => setLoading(false))
  }, [teamID])

  const sortedPlayers = [...players].sort((a, b) => {
    const av = a[sortBy] ?? 0
    const bv = b[sortBy] ?? 0
    return sortDir === 'desc' ? bv - av : av - bv
  })

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f2b46' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#fff', fontSize: 18 }}>Loading team...</p>
      </div>
    </div>
  )

  if (!team) return (
    <div style={{ minHeight: '100vh', background: '#0f2b46' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#c21537', fontSize: 18 }}>Team not found.</p>
      </div>
    </div>
  )

  const winPct = team.GamesPlayed > 0
    ? ((team.Wins / team.GamesPlayed) * 100).toFixed(0) : 0

  // Mobile shows fewer stat columns
  const statCols = isMobile ? [
    { key: 'LastName',    label: 'PLAYER', align: 'left'   },
    { key: 'Goals',       label: 'G',      align: 'center' },
    { key: 'Assists',     label: 'A',      align: 'center' },
    { key: 'Points',      label: 'PTS',    align: 'center' },
    { key: 'GamesPlayed', label: 'GP',     align: 'center' },
  ] : [
    { key: 'LastName',    label: 'PLAYER', align: 'left'   },
    { key: 'Position',    label: 'POS',    align: 'center' },
    { key: 'JerseyNumber',label: '#',      align: 'center' },
    { key: 'Goals',       label: 'G',      align: 'center' },
    { key: 'Assists',     label: 'A',      align: 'center' },
    { key: 'Points',      label: 'PTS',    align: 'center' },
    { key: 'GamesPlayed', label: 'GP',     align: 'center' },
    { key: 'Ppg',         label: 'PPG',    align: 'center' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f2b46', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Navbar />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        .stat-row:hover td { background: rgba(255,255,255,0.04) !important; }
        .sort-btn:hover { color: #f59e0b !important; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 12px' : '32px 24px' }}>

        {/* Team header */}
        <div style={{
          background: '#fff', borderRadius: 12,
          padding: isMobile ? '20px 16px' : '28px 32px',
          marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {team.LeagueName && (
            <div style={{
              display: 'inline-block', background: '#111', color: '#fff',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              padding: '4px 10px', borderRadius: 4, marginBottom: 8,
              textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              {team.LeagueName} {new Date().getFullYear()}
            </div>
          )}

          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: isMobile ? 28 : 42, fontWeight: 800, color: '#111',
            margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.02em',
          }}>
            {team.Name}
          </h1>

          {team.DivisionName && (
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>
              {team.DivisionName} · {team.LeagueName}
            </p>
          )}

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: isMobile ? 16 : 32,
            borderTop: '1px solid #f0f0f0', paddingTop: 16, flexWrap: 'wrap',
          }}>
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
                  fontSize: isMobile ? 22 : 28, fontWeight: 800, color: '#111', lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 10, color: '#999', fontWeight: 600, letterSpacing: '0.08em', marginTop: 3 }}>
                  {stat.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
          {[
            { key: 'roster', label: '👥 Roster' },
            { key: 'stats',  label: '📊 Stats'  },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:      isMobile ? '8px 16px' : '10px 24px',
              background:   tab === t.key ? '#fff' : 'rgba(255,255,255,0.1)',
              border:       'none', borderRadius: '8px 8px 0 0',
              cursor:       'pointer', fontSize: isMobile ? 13 : 14,
              fontWeight:   700, color: tab === t.key ? '#c21537' : 'rgba(255,255,255,0.6)',
              transition:   'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ROSTER TAB */}
        {tab === 'roster' && (
          <div style={{
            background: '#fff', borderRadius: '0 12px 12px 12px',
            padding: isMobile ? '16px' : '24px 28px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 18, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#111', margin: 0,
              }}>
                👥 ROSTER
                <span style={{ fontSize: 12, fontWeight: 400, color: '#999', marginLeft: 6 }}>
                  ({players.length})
                </span>
              </h2>
              <div style={{ display: 'flex', background: '#111', borderRadius: 20, padding: 2, gap: 2 }}>
                {['grid', 'list'].map(v => (
                  <button key={v} onClick={() => setView(v)} style={{
                    background: view === v ? '#fff' : 'none', border: 'none',
                    borderRadius: 18, padding: '5px 10px', cursor: 'pointer',
                    fontSize: 13, color: view === v ? '#111' : '#fff',
                  }}>
                    {v === 'grid' ? '⊞' : '≡'}
                  </button>
                ))}
              </div>
            </div>

            {players.length === 0 ? (
              <p style={{ color: '#999', fontSize: 14 }}>No players found.</p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: view === 'grid'
                  ? `repeat(auto-fill, minmax(${isMobile ? '80px' : '120px'}, 1fr))`
                  : '1fr',
                gap: view === 'grid' ? (isMobile ? 12 : 20) : 8,
              }}>
                {players.map(player => (
                  <div key={player.PlayerID} style={{
                    display: 'flex',
                    flexDirection: view === 'grid' ? 'column' : 'row',
                    alignItems: 'center',
                    gap: view === 'grid' ? 6 : 12,
                    padding: view === 'list' ? '10px 12px' : 0,
                    background: view === 'list' ? '#f9fafb' : 'none',
                    borderRadius: view === 'list' ? 8 : 0,
                    border: view === 'list' ? '0.5px solid #e5e7eb' : 'none',
                  }}>
                    <div style={{
                      width: view === 'grid' ? (isMobile ? 64 : 90) : 40,
                      height: view === 'grid' ? (isMobile ? 64 : 90) : 40,
                      borderRadius: '50%', background: '#e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontWeight: 700,
                      fontSize: view === 'grid' ? (isMobile ? 16 : 22) : 13, color: '#374151',
                    }}>
                      {player.JerseyNumber ? `#${player.JerseyNumber}` : '?'}
                    </div>
                    <div style={{ textAlign: view === 'grid' ? 'center' : 'left', flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#999', fontWeight: 600 }}>
                        {player.FirstName?.toUpperCase()}
                      </div>
                      <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: '#111' }}>
                        {player.LastName?.toUpperCase()}
                      </div>
                      {view === 'list' && (
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {player.Position || 'N/A'} · {player.Goals ?? 0}G {player.Assists ?? 0}A
                        </div>
                      )}
                    </div>
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
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <div style={{
            background: '#111827', borderRadius: '0 12px 12px 12px',
            overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            overflowX: 'auto', // scroll on mobile
          }}>
            {players.length === 0 ? (
              <p style={{ color: '#999', fontSize: 14, padding: 24 }}>No player stats found.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 'auto' : '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {statCols.map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)} className="sort-btn"
                        style={{
                          padding: isMobile ? '10px 8px' : '14px 12px',
                          textAlign: col.align, fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.1em',
                          color: sortBy === col.key ? '#f59e0b' : '#6b7280',
                          cursor: 'pointer', userSelect: 'none', background: '#0d1117',
                          whiteSpace: 'nowrap',
                        }}>
                        {col.label}
                        {sortBy === col.key && <span style={{ marginLeft: 3 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map(player => {
                    const pts      = (player.Goals ?? 0) + (player.Assists ?? 0)
                    const isGoalie = player.Position === 'G'
                    return (
                      <tr key={player.PlayerID} className="stat-row"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

                        <td style={{ padding: isMobile ? '10px 8px' : '14px 12px' }}>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>{player.FirstName}</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: '#fff' }}>
                            {player.LastName?.toUpperCase()}
                          </div>
                        </td>

                        {!isMobile && (
                          <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                            {player.Position ? (
                              <span style={{ padding: '2px 6px', border: '1px solid #f59e0b',
                                borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                                {player.Position}
                              </span>
                            ) : <span style={{ color: '#374151' }}>—</span>}
                          </td>
                        )}

                        {!isMobile && (
                          <td style={{ padding: '14px 12px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                            {player.JerseyNumber || '—'}
                          </td>
                        )}

                        <td style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'center' }}>
                          <span style={{
                            color: isGoalie ? '#374151' : (player.Goals > 0 ? '#10b981' : '#6b7280'),
                            fontWeight: player.Goals > 0 ? 700 : 400, fontSize: isMobile ? 13 : 14,
                          }}>
                            {isGoalie ? '—' : (player.Goals ?? '—')}
                          </span>
                        </td>

                        <td style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'center' }}>
                          <span style={{
                            color: isGoalie ? '#374151' : (player.Assists > 0 ? '#10b981' : '#6b7280'),
                            fontWeight: player.Assists > 0 ? 700 : 400, fontSize: isMobile ? 13 : 14,
                          }}>
                            {isGoalie ? '—' : (player.Assists ?? '—')}
                          </span>
                        </td>

                        <td style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'center' }}>
                          <span style={{
                            color: isGoalie ? '#374151' : (pts > 0 ? '#fff' : '#6b7280'),
                            fontWeight: pts > 0 ? 700 : 400, fontSize: isMobile ? 13 : 14,
                          }}>
                            {isGoalie ? '—' : pts}
                          </span>
                        </td>

                        <td style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'center',
                          color: '#9ca3af', fontSize: isMobile ? 13 : 14 }}>
                          {player.GamesPlayed ?? '—'}
                        </td>

                        {!isMobile && (
                          <td style={{ padding: '14px 12px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                            {player.Ppg ? parseFloat(player.Ppg).toFixed(2) : '—'}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


