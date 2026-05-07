import { useState, useEffect, useMemo } from 'react'
import { getAuthToken, AUTH_HEADER_KEY } from '../context/Authentication'

const STATUS_OPTIONS  = ['Draft', 'Scheduled', 'Completed', 'Postponed', 'Cancelled']
const PAST_STATUSES   = new Set(['Completed', 'Postponed', 'Cancelled'])

const STATUS_STYLES = {
  Draft:     'bg-gray-600 text-gray-100',
  Scheduled: 'bg-blue-700 text-blue-100',
  Completed: 'bg-green-700 text-green-100',
  Postponed: 'bg-yellow-700 text-yellow-100',
  Cancelled: 'bg-red-800 text-red-100',
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_STYLES[status] || 'bg-gray-600 text-gray-100'}`}>
      {status}
    </span>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditGameModal({ game, teams, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    GameDate:          game.GameDate?.split('T')[0] ?? '',
    GameTime:          game.GameTime ?? '',
    Rink:              game.Rink ?? '',
    CurrentGameStatus: game.CurrentGameStatus ?? 'Scheduled',
    HomeTeamScore:     game.HomeTeamScore ?? '',
    AwayTeamScore:     game.AwayTeamScore ?? '',
    HomeTeamID:        game.HomeTeamID ?? '',
    AwayTeamID:        game.AwayTeamID ?? '',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const isCompleted = form.CurrentGameStatus === 'Completed'

  // Division-scoped teams so home/away selectors only show teams from the same division
  const divisionTeams = useMemo(
    () => teams.filter(t => t.DivisionID === game.DivisionID && t.SeasonID === game.SeasonID),
    [teams, game.DivisionID, game.SeasonID]
  )

  const homeTeamName = divisionTeams.find(t => t.ScheduledTeamID === Number(form.HomeTeamID))?.Name ?? game.HomeTeamName
  const awayTeamName = divisionTeams.find(t => t.ScheduledTeamID === Number(form.AwayTeamID))?.Name ?? game.AwayTeamName

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700 overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-bold text-lg">Edit Game</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {game.HomeTeamName} vs {game.AwayTeamName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-gray-400 text-xs uppercase tracking-wide">Status</span>
            <select
              className="bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              value={form.CurrentGameStatus}
              onChange={e => {
                const newStatus = e.target.value
                setForm(f => ({
                  ...f,
                  CurrentGameStatus: newStatus,
                  ...(newStatus !== 'Completed' ? { HomeTeamScore: '', AwayTeamScore: '' } : {}),
                }))
              }}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs uppercase tracking-wide">Date</span>
            <input
              type="date"
              className="bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              value={form.GameDate}
              onChange={e => set('GameDate', e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs uppercase tracking-wide">Time</span>
            <input
              type="time"
              className="bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              value={form.GameTime}
              onChange={e => set('GameTime', e.target.value)}
            />
          </label>

          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-gray-400 text-xs uppercase tracking-wide">Rink / Location</span>
            <input
              type="text"
              placeholder="e.g. Gunnison Recreation Center"
              className="bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-500"
              value={form.Rink}
              onChange={e => set('Rink', e.target.value)}
            />
          </label>

          {/* Home / Away team re-assignment */}
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs uppercase tracking-wide">Home Team</span>
            <select
              className="bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              value={form.HomeTeamID}
              onChange={e => set('HomeTeamID', Number(e.target.value))}
            >
              {divisionTeams.map(t => (
                <option key={t.ScheduledTeamID} value={t.ScheduledTeamID}>{t.Name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs uppercase tracking-wide">Away Team</span>
            <select
              className="bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
              value={form.AwayTeamID}
              onChange={e => set('AwayTeamID', Number(e.target.value))}
            >
              {divisionTeams.map(t => (
                <option key={t.ScheduledTeamID} value={t.ScheduledTeamID}>{t.Name}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Score entry — only shown when status is Completed */}
        <div className={`mb-5 rounded-lg p-4 border transition-all ${isCompleted ? 'bg-gray-750 border-green-700' : 'bg-gray-700/30 border-gray-600/30 opacity-50 pointer-events-none'}`}
             style={{ background: isCompleted ? 'rgba(20,83,45,0.25)' : undefined }}>
          <p className="text-gray-300 text-xs uppercase tracking-wide mb-3 font-semibold">
            Final Score {!isCompleted && <span className="text-gray-500 normal-case">(set status to Completed to enter)</span>}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">{homeTeamName} (Home)</span>
              <input
                type="number"
                min="0"
                className="bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-green-500 w-full"
                value={form.HomeTeamScore}
                onChange={e => set('HomeTeamScore', e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">{awayTeamName} (Away)</span>
              <input
                type="number"
                min="0"
                className="bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-green-500 w-full"
                value={form.AwayTeamScore}
                onChange={e => set('AwayTeamScore', e.target.value)}
                placeholder="0"
              />
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onSave(game.GameID, form)}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white py-2 rounded font-semibold text-sm transition"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-semibold text-sm transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Game Row ─────────────────────────────────────────────────────────────────
function GameRow({ game, onEdit }) {
  const isCompleted = game.CurrentGameStatus === 'Completed'
  const score = isCompleted && game.HomeTeamScore != null && game.AwayTeamScore != null
    ? `${game.HomeTeamScore} – ${game.AwayTeamScore}`
    : null

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-750 transition" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{fmt(game.GameDate)}</td>
      <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{fmtTime(game.GameTime)}</td>
      <td className="px-4 py-3">
        <div className="text-sm text-white font-medium">{game.HomeTeamName}</div>
        <div className="text-xs text-gray-400">vs {game.AwayTeamName}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">{game.Rink || <span className="text-gray-600 italic">TBA</span>}</td>
      <td className="px-4 py-3">
        {score
          ? <span className="text-green-400 font-bold text-sm">{score}</span>
          : <span className="text-gray-600 text-sm">—</span>
        }
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={game.CurrentGameStatus} />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onEdit(game)}
          className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded transition"
        >
          Edit
        </button>
      </td>
    </tr>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GameResultsManager() {
  const [games, setGames]         = useState([])
  const [teams, setTeams]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [editGame, setEditGame]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState(null)

  const [filters, setFilters] = useState({ leagueID: '', divisionID: '', seasonID: '' })

  // Dropdown options derived from actual game data only
  const uniqueLeagues = useMemo(() =>
    [...new Map(games.map(g => [g.LeagueID, { id: g.LeagueID, name: g.LeagueName }])).values()],
    [games]
  )
  const uniqueDivisions = useMemo(() => {
    const src = filters.leagueID ? games.filter(g => g.LeagueID === Number(filters.leagueID)) : games
    return [...new Map(src.map(g => [g.DivisionID, { id: g.DivisionID, name: g.DivisionName }])).values()]
  }, [games, filters.leagueID])
  const uniqueSeasons = useMemo(() => {
    const src = filters.leagueID ? games.filter(g => g.LeagueID === Number(filters.leagueID)) : games
    const src2 = filters.divisionID ? src.filter(g => g.DivisionID === Number(filters.divisionID)) : src
    return [...new Map(
      src2.filter(g => g.SeasonID).map(g => [g.SeasonID, { id: g.SeasonID, name: g.SeasonName || `Season ${g.SeasonID}` }])
    ).values()]
  }, [games, filters.leagueID, filters.divisionID])

  // Fetch all games and teams once on mount
  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetch('/api/games').then(r => r.json()),
      fetch('/api/scheduled-teams').then(r => r.json()),
    ])
      .then(([gData, tData]) => {
        if (gData.error) throw new Error(gData.error)
        setGames(Array.isArray(gData) ? gData : [])
        setTeams(Array.isArray(tData) ? tData : [])
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  // Client-side filtered games
  const filteredGames = useMemo(() => games.filter(g => {
    if (filters.leagueID   && g.LeagueID   !== Number(filters.leagueID))   return false
    if (filters.divisionID && g.DivisionID !== Number(filters.divisionID)) return false
    if (filters.seasonID   && g.SeasonID   !== Number(filters.seasonID))   return false
    return true
  }), [games, filters])

  // Split filtered games into upcoming / past based on date and status
  const today = new Date().toISOString().split('T')[0]

  const { upcomingGames, pastGames } = useMemo(() => {
    const upcoming = []
    const past     = []
    for (const g of filteredGames) {
      const date = g.GameDate?.split('T')[0] ?? ''
      if (PAST_STATUSES.has(g.CurrentGameStatus) || date < today) {
        past.push(g)
      } else {
        upcoming.push(g)
      }
    }
    // Past games: most recent first
    past.sort((a, b) => (b.GameDate ?? '').localeCompare(a.GameDate ?? ''))
    return { upcomingGames: upcoming, pastGames: past }
  }, [filteredGames, today])

  const displayGames = activeTab === 'upcoming' ? upcomingGames : pastGames

  async function handleSave(gameID, form) {
    setSaving(true)
    setSaveMsg(null)
    try {
      if (Number(form.HomeTeamID) === Number(form.AwayTeamID)) {
        throw new Error('Home and away teams cannot be the same.')
      }
      const body = {
        GameDate:          form.GameDate,
        GameTime:          form.GameTime,
        Rink:              form.Rink || null,
        CurrentGameStatus: form.CurrentGameStatus,
        HomeTeamID:        Number(form.HomeTeamID),
        AwayTeamID:        Number(form.AwayTeamID),
        HomeTeamScore: form.CurrentGameStatus === 'Completed' && form.HomeTeamScore !== ''
          ? Number(form.HomeTeamScore) : null,
        AwayTeamScore: form.CurrentGameStatus === 'Completed' && form.AwayTeamScore !== ''
          ? Number(form.AwayTeamScore) : null,
      }
      const headers = { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() || '' }
      const res = await fetch(`/api/games/${gameID}`, { method: 'PUT', headers, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed') }

      // Update local state
      setGames(prev => prev.map(g => g.GameID === gameID
        ? { ...g, ...body, HomeTeamName: teams.find(t => t.ScheduledTeamID === body.HomeTeamID)?.Name ?? g.HomeTeamName,
                           AwayTeamName: teams.find(t => t.ScheduledTeamID === body.AwayTeamID)?.Name ?? g.AwayTeamName }
        : g
      ))
      setSaveMsg({ type: 'ok', text: 'Game updated successfully.' })
      setEditGame(null)
    } catch (e) {
      setSaveMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Game Results</h1>
        <p className="text-gray-400 text-sm mt-1">
          View and manage all games — enter scores, update statuses, and edit game details.
        </p>
      </div>

      {/* Save message */}
      {saveMsg && (
        <div className={`mb-4 px-4 py-3 rounded text-sm flex items-center justify-between ${saveMsg.type === 'ok' ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
          <span>{saveMsg.text}</span>
          <button onClick={() => setSaveMsg(null)} className="text-current opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:outline-none focus:border-red-500"
          value={filters.leagueID}
          onChange={e => setFilters({ leagueID: e.target.value, divisionID: '', seasonID: '' })}
        >
          <option value="">All Leagues</option>
          {uniqueLeagues.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        {filters.leagueID && uniqueDivisions.length > 0 && (
          <select
            className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:outline-none focus:border-red-500"
            value={filters.divisionID}
            onChange={e => setFilters(f => ({ ...f, divisionID: e.target.value, seasonID: '' }))}
          >
            <option value="">All Divisions</option>
            {uniqueDivisions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        {filters.leagueID && uniqueSeasons.length > 0 && (
          <select
            className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:outline-none focus:border-red-500"
            value={filters.seasonID}
            onChange={e => setFilters(f => ({ ...f, seasonID: e.target.value }))}
          >
            <option value="">All Seasons</option>
            {uniqueSeasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-700">
        {[
          { key: 'upcoming', label: 'Upcoming', count: upcomingGames.length },
          { key: 'past',     label: 'Past Games', count: pastGames.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-700 text-white border-b-2 border-red-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
            {!loading && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading games…</div>
        ) : error ? (
          <div className="py-16 text-center text-red-400">{error}</div>
        ) : displayGames.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            {activeTab === 'upcoming' ? 'No upcoming games for the selected filters.' : 'No past games for the selected filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900/50">
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wide">Time</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wide">Matchup</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wide">Rink</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wide">Score</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {displayGames.map(game => (
                  <GameRow key={game.GameID} game={game} onEdit={setEditGame} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary line */}
      {!loading && !error && (
        <p className="text-gray-600 text-xs mt-3">
          {upcomingGames.length} upcoming · {pastGames.length} past
          {filteredGames.some(g => g.CurrentGameStatus === 'Scheduled' && (g.GameDate?.split('T')[0] ?? '') < today) && (
            <span className="text-yellow-500 ml-2">⚠ Some past-date games are still marked Scheduled — update their status.</span>
          )}
        </p>
      )}

      {/* Edit modal */}
      {editGame && (
        <EditGameModal
          game={editGame}
          teams={teams}
          onSave={handleSave}
          onClose={() => { setEditGame(null); setSaveMsg(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}
