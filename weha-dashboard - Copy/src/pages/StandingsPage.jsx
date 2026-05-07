import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PublicNavbar from '../components/PublicNavbar'
import PublicFooter from '../components/PublicFooter'

// Strip trailing " YYYY" or " YYYY-YYYY" year suffix so year-per-league entries
// (e.g. "WEHA Fall Adult Leagues 2022", "...2023", etc.) collapse under one name.
function getBaseName(name) {
  return name.replace(/\s+\d{4}(-\d{4})?$/, '').trim()
}

// Short year label for a season pill relative to its grouped base league name.
function getSeasonLabel(season, baseName) {
  const yearFromLeague = season.LeagueName.replace(baseName, '').trim()
  if (yearFromLeague && /^\d{4}(-\d{4})?$/.test(yearFromLeague)) return yearFromLeague
  const m = season.SeasonName.match(/(\d{4}(?:-\d{4})?)$/)
  if (m) return m[1]
  return season.SeasonName
}

export default function StandingsPage() {
  const [allSeasons, setAllSeasons]         = useState([])
  const [activeLeague, setActiveLeague]     = useState('')
  const [activeSeasonID, setActiveSeasonID] = useState(null)
  const [activeDivision, setActiveDivision] = useState('All')
  const [allRows, setAllRows]               = useState([])
  const [pageLoading, setPageLoading]       = useState(true)
  const [tableLoading, setTableLoading]     = useState(false)
  const [error, setError]                   = useState(null)

  // Load all seasons on mount
  useEffect(() => {
    fetch('/api/getSeasons')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) { setPageLoading(false); return }
        setAllSeasons(data)
        const today = new Date().toISOString().slice(0, 10)
        const hit = data.find(s => s.FirstGameDate && s.FirstGameDate <= today && s.LastGameDate >= today) ?? data[0]
        setActiveLeague(getBaseName(hit.LeagueName))
      })
      .catch(() => setPageLoading(false))
  }, [])

  const leagues = useMemo(
    () => [...new Set(allSeasons.map(s => getBaseName(s.LeagueName)))].sort(),
    [allSeasons]
  )

  const leagueSeasons = useMemo(
    () => allSeasons.filter(s => getBaseName(s.LeagueName) === activeLeague),
    [allSeasons, activeLeague]
  )

  // Build a label map: use full SeasonName when two seasons share the same short label
  const seasonLabelMap = useMemo(() => {
    const counts = {}
    for (const s of leagueSeasons) {
      const lbl = getSeasonLabel(s, activeLeague)
      counts[lbl] = (counts[lbl] || 0) + 1
    }
    return leagueSeasons.reduce((acc, s) => {
      const raw = getSeasonLabel(s, activeLeague)
      acc[s.SeasonID] = counts[raw] > 1 ? s.SeasonName : raw
      return acc
    }, {})
  }, [leagueSeasons, activeLeague])

  // When league changes → pick the current or most-recent season for that league
  useEffect(() => {
    if (leagueSeasons.length === 0) return
    const today = new Date().toISOString().slice(0, 10)
    const current = leagueSeasons.find(s => s.FirstGameDate && s.FirstGameDate <= today && s.LastGameDate >= today)
      ?? leagueSeasons[0]
    setActiveSeasonID(current.SeasonID)
    setActiveDivision('All')
  }, [activeLeague]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch standings when season changes
  useEffect(() => {
    if (!activeSeasonID) return
    setTableLoading(true)
    setError(null)
    fetch(`/api/standings?seasonID=${activeSeasonID}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setAllRows(Array.isArray(data) ? data : [])
        setTableLoading(false)
        setPageLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setTableLoading(false)
        setPageLoading(false)
      })
  }, [activeSeasonID])

  // Unique division names from current standings
  const divisions = useMemo(() => {
    const names = [...new Set(allRows.map(r => r.DivisionName))].sort()
    return ['All', ...names]
  }, [allRows])

  // Reset division if no longer in list
  useEffect(() => {
    if (!divisions.includes(activeDivision)) setActiveDivision('All')
  }, [divisions]) // eslint-disable-line react-hooks/exhaustive-deps

  // Group rows by division, each group sorted by Pts
  const groupedRows = useMemo(() => {
    const rows = activeDivision === 'All'
      ? allRows
      : allRows.filter(r => r.DivisionName === activeDivision)

    const groups = {}
    for (const row of rows) {
      const div = row.DivisionName
      if (!groups[div]) groups[div] = []
      groups[div].push({ ...row, Pts: row.Wins * 2 + row.Ties })
    }
    for (const div of Object.keys(groups)) {
      groups[div].sort((a, b) =>
        b.Pts - a.Pts || b.Wins - a.Wins || a.Losses - b.Losses || a.TeamName.localeCompare(b.TeamName)
      )
    }
    return groups
  }, [allRows, activeDivision])

  const today = new Date().toISOString().slice(0, 10)
  const isCurrentSeason = (s) => s && s.FirstGameDate && s.FirstGameDate <= today && s.LastGameDate >= today
  const activeSeason = allSeasons.find(s => s.SeasonID === activeSeasonID)
  const activeSeasonLabel = activeSeason ? (seasonLabelMap[activeSeason.SeasonID] ?? getSeasonLabel(activeSeason, activeLeague)) : null

  if (pageLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f2b46' }}>
        <PublicNavbar />
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingTop: 80, fontSize: 15 }}>
          Loading standings…
        </p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f2b46', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <PublicNavbar />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        select option { background: #0f2b46; }
        .team-link { text-decoration: none; color: inherit; }
        .team-link:hover .team-name { color: #93c5fd; text-decoration: underline; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 36, fontWeight: 800, color: '#fff',
            textTransform: 'uppercase', letterSpacing: '0.03em',
            margin: '0 0 6px',
          }}>
            League Standings
          </h1>
          <p style={{ color: '#93c5fd', fontSize: 14, margin: 0 }}>
            {activeSeason
              ? `${activeLeague}${activeSeasonLabel ? ` · ${activeSeasonLabel}` : ''}${isCurrentSeason(activeSeason) ? ' — season in progress' : ' — final standings'}`
              : 'Select a league to view standings'}
          </p>
        </div>

        {/* ── Row 1: League dropdown ── */}
        {leagues.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
              League
            </span>
            <select
              value={activeLeague}
              onChange={e => setActiveLeague(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                minWidth: 180,
              }}
            >
              {leagues.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Row 2: Season pills (always shown when multiple seasons exist) ── */}
        {leagueSeasons.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
              Season
            </span>
            {leagueSeasons.map(s => {
              const isCurrent = isCurrentSeason(s)
              const isActive  = s.SeasonID === activeSeasonID
              const label     = seasonLabelMap[s.SeasonID] ?? getSeasonLabel(s, activeLeague)
              return (
                <button
                  key={s.SeasonID}
                  onClick={() => { setActiveSeasonID(s.SeasonID); setActiveDivision('All') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px',
                    borderRadius: 9999,
                    fontSize: 13,
                    fontWeight: 700,
                    border: isActive ? '2px solid #facc15' : '2px solid rgba(255,255,255,0.15)',
                    background: isActive ? 'rgba(250,204,21,0.12)' : 'transparent',
                    color: isActive ? '#facc15' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                  {isCurrent && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
                      background: '#16a34a', color: '#fff',
                      borderRadius: 4, padding: '1px 5px',
                      textTransform: 'uppercase',
                    }}>
                      LIVE
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Row 3: Division filter pills (only when multiple divisions) ── */}
        {!tableLoading && divisions.length > 2 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
              Division
            </span>
            {divisions.map(div => (
              <button
                key={div}
                onClick={() => setActiveDivision(div)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  border: activeDivision === div ? '2px solid #93c5fd' : '2px solid rgba(255,255,255,0.15)',
                  background: activeDivision === div ? 'rgba(147,197,253,0.12)' : 'transparent',
                  color: activeDivision === div ? '#93c5fd' : 'rgba(255,255,255,0.45)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {div}
              </button>
            ))}
          </div>
        )}

        {/* ── Standings tables ── */}
        {tableLoading ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '48px 0', fontSize: 15 }}>
            Loading…
          </p>
        ) : error ? (
          <p style={{ color: '#f87171', textAlign: 'center', padding: '48px 0', fontSize: 15 }}>{error}</p>
        ) : Object.keys(groupedRows).length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '48px 0', fontSize: 15 }}>
            No teams found.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(groupedRows).map(([division, teams]) => (
              <DivisionTable key={division} division={division} teams={teams} showDivisionHeader={divisions.length > 2} />
            ))}
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  )
}

function DivisionTable({ division, teams, showDivisionHeader }) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {showDivisionHeader && (
        <div style={{
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
          }}>Division</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{division}</span>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}>
              {[
                { label: '#',    align: 'left',   pad: '10px 12px 10px 20px' },
                { label: 'Team', align: 'left',   pad: '10px 20px' },
                { label: 'GP',   align: 'center', pad: '10px 16px' },
                { label: 'W',    align: 'center', pad: '10px 16px' },
                { label: 'L',    align: 'center', pad: '10px 16px' },
                { label: 'T',    align: 'center', pad: '10px 16px' },
                { label: 'PTS',  align: 'center', pad: '10px 20px 10px 16px' },
              ].map(({ label, align, pad }) => (
                <th key={label} style={{
                  padding: pad, textAlign: align,
                  fontSize: 11, fontWeight: 700,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <tr
                key={team.ScheduledTeamID}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={{ padding: '14px 12px 14px 20px', fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  {i + 1}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <Link to={`/team/${team.ScheduledTeamID}`} className="team-link">
                    <div className="team-name" style={{ fontSize: 14, fontWeight: 600, color: '#fff', transition: 'color 0.15s' }}>
                      {team.TeamName}
                    </div>
                  </Link>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
                  {team.GamesPlayed}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#4ade80' }}>
                  {team.Wins}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 14, color: '#f87171' }}>
                  {team.Losses}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
                  {team.Ties}
                </td>
                <td style={{ padding: '14px 20px 14px 16px', textAlign: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{team.Pts}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '8px 20px', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>2 pts per win · 1 pt per tie · click a team to view roster</span>
      </div>
    </div>
  )
}
