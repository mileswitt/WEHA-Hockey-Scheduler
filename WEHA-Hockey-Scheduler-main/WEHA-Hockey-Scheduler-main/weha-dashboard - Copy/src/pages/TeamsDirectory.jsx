// Public teams directory — "/teams".
// Lists every ScheduledTeam grouped by league and division so players
// can find and click through to their team page without needing a direct link.
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PublicNavbar from '../components/PublicNavbar'
import PublicFooter from '../components/PublicFooter'

export default function TeamsDirectory() {
  const [teams,   setTeams]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    fetch('/api/localteams')
      .then(r => r.json())
      .then(data => { setTeams(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Group teams: league → division → team[]
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? teams.filter(t =>
          t.Name?.toLowerCase().includes(q) ||
          t.LeagueName?.toLowerCase().includes(q) ||
          t.DivisionName?.toLowerCase().includes(q)
        )
      : teams

    const map = {}
    for (const team of filtered) {
      const league = team.LeagueName || 'Unknown League'
      const div    = team.DivisionName || 'Unknown Division'
      if (!map[league])       map[league] = {}
      if (!map[league][div])  map[league][div] = []
      map[league][div].push(team)
    }
    return map
  }, [teams, search])

  const leagueNames = Object.keys(grouped).sort()

  return (
    <div style={{ minHeight: '100vh', background: '#0f2b46', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <PublicNavbar />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily:    "'Barlow Condensed', sans-serif",
            fontSize:      36,
            fontWeight:    800,
            color:         '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            margin:        '0 0 6px',
          }}>
            Teams
          </h1>
          <p style={{ color: '#93c5fd', fontSize: 14, margin: 0 }}>
            Find your team and view the full roster.
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 28 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by team, league, or division…"
            style={{
              width:        '100%',
              maxWidth:     400,
              background:   'rgba(255,255,255,0.08)',
              border:       '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color:        '#fff',
              fontSize:     14,
              padding:      '10px 14px',
              outline:      'none',
            }}
          />
        </div>

        {loading && (
          <p style={{ color: '#aaa', fontSize: 16 }}>Loading teams…</p>
        )}

        {!loading && leagueNames.length === 0 && (
          <p style={{ color: '#aaa', fontSize: 16 }}>
            {search ? 'No teams match your search.' : 'No teams have been added yet.'}
          </p>
        )}

        {leagueNames.map(league => (
          <div key={league} style={{ marginBottom: 36 }}>
            {/* League heading */}
            <div style={{
              display:       'flex',
              alignItems:    'center',
              gap:           10,
              marginBottom:  16,
              paddingBottom: 10,
              borderBottom:  '2px solid rgba(194,21,55,0.5)',
            }}>
              <h2 style={{
                fontFamily:    "'Barlow Condensed', sans-serif",
                fontSize:      22,
                fontWeight:    800,
                color:         '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin:        0,
              }}>
                {league}
              </h2>
            </div>

            {/* Divisions */}
            {Object.keys(grouped[league]).sort().map(division => (
              <div key={division} style={{ marginBottom: 24 }}>
                <h3 style={{
                  fontSize:      13,
                  fontWeight:    700,
                  color:         '#93c5fd',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin:        '0 0 12px',
                }}>
                  {division}
                </h3>

                <div style={{
                  display:             'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap:                 12,
                }}>
                  {grouped[league][division].map(team => (
                    <Link
                      key={team.TeamID}
                      to={`/team/${team.TeamID}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div style={{
                        background:   '#fff',
                        borderRadius: 10,
                        padding:      '16px 18px',
                        transition:   'transform 0.1s, box-shadow 0.1s',
                        cursor:       'pointer',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.18)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                      >
                        <div style={{
                          fontFamily:    "'Barlow Condensed', sans-serif",
                          fontSize:      17,
                          fontWeight:    800,
                          color:         '#111',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          marginBottom:  6,
                        }}>
                          {team.Name}
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          {[
                            { label: 'W', value: team.Wins   },
                            { label: 'L', value: team.Losses },
                            { label: 'T', value: team.Ties   },
                          ].map(s => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1 }}>{s.value}</div>
                              <div style={{ fontSize: 10, color: '#999', fontWeight: 600, letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: '#c21537', fontWeight: 600 }}>
                          View roster →
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <PublicFooter />
    </div>
  )
}
