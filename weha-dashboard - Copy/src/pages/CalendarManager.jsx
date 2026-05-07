import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAuthToken, AUTH_HEADER_KEY } from '../context/Authentication'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

function authHeaders() {
  return { [AUTH_HEADER_KEY]: getAuthToken(), 'Content-Type': 'application/json' }
}

function formatDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${m}/${d}/${y}`
}

const DIV_COLORS = {
  'A League': '#16a34a', 'B League': '#1d7aab', 'C League': '#7c3aed',
  'A/B League': '#c2610c', 'C/B League': '#c0392b',
  '10U A': '#b45309', '10U B': '#0d9488', '12U A': '#b94000',
  '12U B': '#6d28d9', '14U A': '#1e6fa5', '14U B': '#991b1b',
}
function divColor(name) { return DIV_COLORS[name] || '#6b7280' }

function detectConflicts(games) {
  const conflicts = []

  // Team double-booked: same team (home or away) on the same date
  const teamDateMap = new Map()
  for (const g of games) {
    for (const [teamID, teamName] of [[g.HomeTeamID, g.HomeTeamName], [g.AwayTeamID, g.AwayTeamName]]) {
      const key = `team::${teamID}::${g.GameDate}`
      if (!teamDateMap.has(key)) teamDateMap.set(key, { teamName, date: g.GameDate, games: [] })
      const entry = teamDateMap.get(key)
      if (!entry.games.find(x => x.GameID === g.GameID)) entry.games.push(g)
    }
  }
  for (const entry of teamDateMap.values()) {
    if (entry.games.length > 1) conflicts.push({ type: 'team', ...entry })
  }

  // Rink double-booked: same rink at the same date + time
  const rinkMap = new Map()
  for (const g of games) {
    if (!g.Rink?.trim() || !g.GameTime) continue
    const key = `rink::${g.Rink.trim().toLowerCase()}::${g.GameDate}::${g.GameTime}`
    if (!rinkMap.has(key)) rinkMap.set(key, { rink: g.Rink, date: g.GameDate, time: g.GameTime, games: [] })
    const entry = rinkMap.get(key)
    if (!entry.games.find(x => x.GameID === g.GameID)) entry.games.push(g)
  }
  for (const entry of rinkMap.values()) {
    if (entry.games.length > 1) conflicts.push({ type: 'rink', ...entry })
  }

  return conflicts
}

const ADMIN_CAL_CSS = `
  .admin-cal .fc { background: transparent; color: #e5e7eb; }
  .admin-cal .fc-toolbar-title { color: #f9fafb !important; font-size: 1.2rem !important; }
  .admin-cal .fc-button {
    background: #374151 !important; border: 1px solid #4b5563 !important;
    color: #e5e7eb !important; border-radius: 6px !important; font-size: 0.8rem !important;
  }
  .admin-cal .fc-button:hover { background: #4b5563 !important; }
  .admin-cal .fc-button-active { background: #dc2626 !important; border-color: #dc2626 !important; color: #fff !important; }
  .admin-cal .fc-button:disabled { opacity: 0.5 !important; }
  .admin-cal .fc-col-header-cell-cushion { color: #9ca3af !important; text-decoration: none !important; }
  .admin-cal .fc-col-header-cell { background: #1f2937 !important; border-color: #374151 !important; }
  .admin-cal .fc-daygrid-day { background: #111827 !important; border-color: #374151 !important; }
  .admin-cal .fc-daygrid-day:hover { background: #1a2535 !important; }
  .admin-cal .fc-day-other .fc-daygrid-day-number { color: rgba(255,255,255,0.2) !important; }
  .admin-cal .fc-daygrid-day-number { color: rgba(255,255,255,0.7) !important; font-size: 12px !important; padding: 4px 7px !important; text-decoration: none !important; }
  .admin-cal .fc-daygrid-day.fc-day-today { background: rgba(220,38,38,0.12) !important; }
  .admin-cal .fc-event { border-radius: 4px !important; padding: 2px 5px !important; font-size: 0.7rem !important; cursor: pointer !important; }
  .admin-cal .fc-event-title { color: #fff !important; font-weight: 600 !important; }
  .admin-cal .fc-event-time { color: rgba(255,255,255,0.8) !important; }
  .admin-cal .fc-event:hover { opacity: 0.85; filter: brightness(1.1); }
  .admin-cal .fc-scrollgrid, .admin-cal .fc-scrollgrid td, .admin-cal .fc-scrollgrid th { border-color: #374151 !important; }
  .admin-cal .fc-more-link { color: #93c5fd !important; font-size: 11px !important; font-weight: 600 !important; text-decoration: underline !important; }
  .admin-cal .fc-popover { background: #1f2937 !important; border: 1px solid #374151 !important; border-radius: 8px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important; }
  .admin-cal .fc-popover-header { background: #111827 !important; padding: 8px 12px !important; border-bottom: 1px solid #374151 !important; }
  .admin-cal .fc-popover-title { color: #fff !important; font-size: 12px !important; }
  .admin-cal .fc-popover-close { color: rgba(255,255,255,0.7) !important; }
  .admin-cal .fc-timegrid-slot { border-color: #374151 !important; min-height: 2rem !important; }
  .admin-cal .fc-timegrid-slot-label { color: #6b7280 !important; font-size: 11px !important; }
  .admin-cal .fc-timegrid-axis { border-color: #374151 !important; }
  .admin-cal .fc-timegrid-col { background: #111827 !important; }
  .admin-cal .fc-timegrid-col.fc-day-today { background: rgba(220,38,38,0.08) !important; }
  .admin-cal .fc-timegrid-now-indicator-line { border-color: #ef4444 !important; }
  .admin-cal a { text-decoration: none !important; }
`

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ label, details, onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 className="text-white font-semibold text-lg mb-2">Confirm Delete</h3>
        <p className="text-gray-300 mb-1">{label}</p>
        {details && <p className="text-red-400 text-sm mb-5">{details}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded font-medium transition">
            {busy ? 'Deleting…' : 'Delete'}
          </button>
          <button onClick={onCancel} disabled={busy}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Game Edit Modal ───────────────────────────────────────────────────────────

function GameEditModal({ game, teams, form, onChange, onSave, onDelete, onCancel, saving }) {
  const divisionID = teams.find(t => t.ScheduledTeamID === form.HomeTeamID)?.DivisionID
    || teams.find(t => t.ScheduledTeamID === game.HomeTeamID)?.DivisionID
  const divTeams = divisionID ? teams.filter(t => t.DivisionID === divisionID) : teams

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">Edit Game</h3>
          <span className="text-gray-500 text-xs">{game.LeagueName} · {game.DivisionName}</span>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Home Team</label>
              <select value={form.HomeTeamID}
                onChange={e => onChange({ ...form, HomeTeamID: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                {divTeams.map(t => <option key={t.ScheduledTeamID} value={t.ScheduledTeamID}>{t.Name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Away Team</label>
              <select value={form.AwayTeamID}
                onChange={e => onChange({ ...form, AwayTeamID: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                {divTeams.map(t => <option key={t.ScheduledTeamID} value={t.ScheduledTeamID}>{t.Name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Date</label>
              <input type="date" value={form.GameDate}
                onChange={e => onChange({ ...form, GameDate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Time</label>
              <input type="time" value={form.GameTime}
                onChange={e => onChange({ ...form, GameTime: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Rink</label>
              <input type="text" value={form.Rink}
                onChange={e => onChange({ ...form, Rink: e.target.value })}
                placeholder="Rink name"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Status</label>
              <select value={form.CurrentGameStatus}
                onChange={e => onChange({ ...form, CurrentGameStatus: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                <option value="Draft">Draft</option>
                <option value="Scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onSave} disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded font-medium transition">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={onDelete} disabled={saving}
            className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white py-2 px-4 rounded transition">
            Delete
          </button>
          <button onClick={onCancel} disabled={saving}
            className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Module-level cache so navigating away and back doesn't re-fetch everything.
// Cleared whenever the user saves/deletes a game or team (via invalidateCalendarCache).
let _calendarCache = null

function invalidateCalendarCache() { _calendarCache = null }

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CalendarManager() {
  const [tab, setTab] = useState('calendar')
  const [teams, setTeams] = useState(_calendarCache?.teams ?? [])
  const [games, setGames] = useState(_calendarCache?.games ?? [])
  const [leaguesData, setLeaguesData] = useState(_calendarCache?.leaguesData ?? { leagues: [], divisions: [], seasons: [] })
  const [loading, setLoading] = useState(!_calendarCache)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [leagueFilter, setLeagueFilter] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')
  const [seasonFilter, setSeasonFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [editGame, setEditGame] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  const [confirmModal, setConfirmModal] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    if (_calendarCache) return  // already loaded, state initialised from cache above
    setLoading(true)
    setError('')
    try {
      const [teamsRes, gamesRes, leaguesRes] = await Promise.all([
        fetch('/api/scheduled-teams'),
        fetch('/api/games'),
        fetch('/api/leagues-divisions'),
      ])
      const [teamsData, gamesData, leaguesJson] = await Promise.all([
        teamsRes.json(), gamesRes.json(), leaguesRes.json(),
      ])
      const t = Array.isArray(teamsData) ? teamsData : []
      const g = Array.isArray(gamesData) ? gamesData : []
      const l = leaguesJson && typeof leaguesJson === 'object' ? leaguesJson : { leagues: [], divisions: [], seasons: [] }
      _calendarCache = { teams: t, games: g, leaguesData: l }
      setTeams(t)
      setGames(g)
      setLeaguesData(l)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function flashSuccess(msg) {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  function openEdit(game) {
    setEditGame(game)
    setEditForm({
      HomeTeamID: game.HomeTeamID,
      AwayTeamID: game.AwayTeamID,
      GameDate: game.GameDate,
      GameTime: game.GameTime || '',
      Rink: game.Rink || '',
      CurrentGameStatus: game.CurrentGameStatus,
    })
  }

  async function saveEdit() {
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/games/${editGame.GameID}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Failed to save')
      const homeName = teams.find(t => t.ScheduledTeamID === editForm.HomeTeamID)?.Name || editGame.HomeTeamName
      const awayName = teams.find(t => t.ScheduledTeamID === editForm.AwayTeamID)?.Name || editGame.AwayTeamName
      const updated = prev => prev.map(g =>
        g.GameID === editGame.GameID
          ? { ...g, ...editForm, HomeTeamName: homeName, AwayTeamName: awayName }
          : g
      )
      setGames(prev => { const next = updated(prev); if (_calendarCache) _calendarCache = { ..._calendarCache, games: next }; return next })
      setEditGame(null)
      flashSuccess('Game updated')
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingEdit(false)
    }
  }

  async function doDeleteGame(gameID) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/games/${gameID}`, {
        method: 'DELETE',
        headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      if (!res.ok) throw new Error('Failed to delete game')
      setGames(prev => { const next = prev.filter(g => g.GameID !== gameID); if (_calendarCache) _calendarCache = { ..._calendarCache, games: next }; return next })
      flashSuccess('Game deleted')
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
      setConfirmModal(null)
    }
  }

  async function doBulkDeleteGames(gameIDs) {
    setDeleting(true)
    try {
      await Promise.all(gameIDs.map(id =>
        fetch(`/api/games/${id}`, { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } })
      ))
      const idSet = new Set(gameIDs)
      setGames(prev => {
        const next = prev.filter(g => !idSet.has(g.GameID))
        if (_calendarCache) _calendarCache = { ..._calendarCache, games: next }
        return next
      })
      flashSuccess(`${gameIDs.length} game${gameIDs.length !== 1 ? 's' : ''} deleted`)
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
      setConfirmModal(null)
    }
  }

  async function handleEventDrop({ event, revert }) {
    const gameID = Number(event.id)
    const newDate = event.startStr.split('T')[0]
    const hasTime = event.startStr.includes('T')
    const newTime = hasTime ? event.startStr.split('T')[1].substring(0, 5) : null
    try {
      const body = { GameDate: newDate }
      if (newTime) body.GameTime = newTime
      const res = await fetch(`/api/games/${gameID}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(body),
      })
      if (!res.ok) { revert(); throw new Error('Failed to move game') }
      setGames(prev => {
        const next = prev.map(g => g.GameID === gameID ? { ...g, GameDate: newDate, ...(newTime ? { GameTime: newTime } : {}) } : g)
        if (_calendarCache) _calendarCache = { ..._calendarCache, games: next }
        return next
      })
      flashSuccess('Game moved')
    } catch (e) {
      revert()
      setError(e.message)
    }
  }

  async function doDeleteTeam(teamId) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/scheduled-teams/${teamId}`, {
        method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      if (!res.ok) throw new Error('Failed to delete team')
      setTeams(prev => { const next = prev.filter(t => t.ScheduledTeamID !== teamId); if (_calendarCache) _calendarCache = { ..._calendarCache, teams: next }; return next })
      setGames(prev => { const next = prev.filter(g => g.HomeTeamID !== teamId && g.AwayTeamID !== teamId); if (_calendarCache) _calendarCache = { ..._calendarCache, games: next }; return next })
      flashSuccess('Team and all its games deleted')
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
      setConfirmModal(null)
    }
  }

  async function reloadAfterStructureChange() {
    invalidateCalendarCache()
    setLoading(true)
    await loadData()
  }

  async function doDeleteDivision(divisionId) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/division/${divisionId}`, {
        method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      await reloadAfterStructureChange()
      flashSuccess('Division deleted')
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
      setConfirmModal(null)
    }
  }

  async function doDeleteLeague(leagueId) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/league/${leagueId}`, {
        method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      await reloadAfterStructureChange()
      flashSuccess('League deleted')
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
      setConfirmModal(null)
    }
  }

  async function doDeleteSeason(seasonId) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/season/${seasonId}`, {
        method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      await reloadAfterStructureChange()
      flashSuccess('Season deleted')
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
      setConfirmModal(null)
    }
  }

  // Filter options derived from actual game data only
  const uniqueLeagues = useMemo(() =>
    [...new Map(games.map(g => [g.LeagueID, { id: g.LeagueID, name: g.LeagueName }])).values()],
    [games]
  )
  const uniqueDivisions = useMemo(() => {
    const src = leagueFilter ? games.filter(g => g.LeagueID === Number(leagueFilter)) : games
    return [...new Map(src.map(g => [g.DivisionID, { id: g.DivisionID, name: g.DivisionName }])).values()]
  }, [games, leagueFilter])

  const uniqueSeasons = useMemo(() => {
    const src = leagueFilter ? games.filter(g => g.LeagueID === Number(leagueFilter)) : games
    const src2 = divisionFilter ? src.filter(g => g.DivisionID === Number(divisionFilter)) : src
    return [...new Map(
      src2.filter(g => g.SeasonID).map(g => [g.SeasonID, { id: g.SeasonID, name: g.SeasonName || `Season ${g.SeasonID}` }])
    ).values()]
  }, [games, leagueFilter, divisionFilter])

  const filteredGames = useMemo(() => games.filter(g => {
    if (leagueFilter && g.LeagueID !== Number(leagueFilter)) return false
    if (divisionFilter && g.DivisionID !== Number(divisionFilter)) return false
    if (seasonFilter && g.SeasonID !== Number(seasonFilter)) return false
    if (statusFilter && g.CurrentGameStatus !== statusFilter) return false
    return true
  }), [games, leagueFilter, divisionFilter, seasonFilter, statusFilter])

  const calEvents = useMemo(() => filteredGames.map(g => ({
    id: String(g.GameID),
    title: `${g.HomeTeamName} vs ${g.AwayTeamName}`,
    start: g.GameTime ? `${g.GameDate}T${g.GameTime}` : g.GameDate,
    backgroundColor: divColor(g.DivisionName),
    borderColor: 'transparent',
    textColor: '#fff',
    extendedProps: g,
  })), [filteredGames])

  const conflicts = useMemo(() => detectConflicts(games), [games])

  const teamsByDivision = useMemo(() =>
    teams.reduce((acc, t) => { acc[t.DivisionID] = (acc[t.DivisionID] || 0) + 1; return acc }, {}),
    [teams]
  )
  const teamsByLeague = useMemo(() =>
    teams.reduce((acc, t) => { acc[t.LeagueID] = (acc[t.LeagueID] || 0) + 1; return acc }, {}),
    [teams]
  )

  const { leagues = [], divisions = [], seasons = [] } = leaguesData
  // Only show leagues that have at least one ScheduledTeam
  const activeLeagues = leagues.filter(l => (teamsByLeague[l.id] || 0) > 0)

  return (
    <div className="max-w-7xl mx-auto">
      <style>{ADMIN_CAL_CSS}</style>
      <h1 className="text-2xl font-bold text-white mb-1">Calendar Manager</h1>
      <p className="text-gray-400 text-sm mb-6">Edit game times, drag games to move them, and manage your league structure.</p>

      <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-lg w-fit">
        {[['calendar', 'Calendar View'], ['structure', 'Leagues & Divisions']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${tab === key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded text-sm">
          {error}
          <button className="ml-3 underline" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : tab === 'calendar' ? (
        <CalendarTab
          filteredGames={filteredGames}
          calEvents={calEvents}
          uniqueLeagues={uniqueLeagues}
          uniqueDivisions={uniqueDivisions}
          uniqueSeasons={uniqueSeasons}
          leagueFilter={leagueFilter}
          setLeagueFilter={v => { setLeagueFilter(v); setDivisionFilter(''); setSeasonFilter('') }}
          divisionFilter={divisionFilter}
          setDivisionFilter={v => { setDivisionFilter(v); setSeasonFilter('') }}
          seasonFilter={seasonFilter}
          setSeasonFilter={setSeasonFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onEventClick={info => openEdit(info.event.extendedProps)}
          onEventDrop={handleEventDrop}
          conflicts={conflicts}
          onEditGame={openEdit}
          onBulkDelete={games => {
            const hasFilter = leagueFilter || divisionFilter || seasonFilter || statusFilter
            if (!hasFilter || games.length === 0) return
            const parts = [
              leagueFilter && uniqueLeagues.find(l => l.id === Number(leagueFilter))?.name,
              divisionFilter && uniqueDivisions.find(d => d.id === Number(divisionFilter))?.name,
              seasonFilter && uniqueSeasons.find(s => s.id === Number(seasonFilter))?.name,
              statusFilter && `status: ${statusFilter}`,
            ].filter(Boolean).join(' · ')
            setConfirmModal({
              label: `Delete ${games.length} game${games.length !== 1 ? 's' : ''}?`,
              details: `Filter: ${parts}. This cannot be undone.`,
              onConfirm: () => doBulkDeleteGames(games.map(g => g.GameID)),
            })
          }}
        />
      ) : (
        <StructureTab
          leagues={activeLeagues}
          divisions={divisions}
          seasons={seasons}
          teams={teams}
          teamsByDivision={teamsByDivision}
          teamsByLeague={teamsByLeague}
          onDeleteTeam={team => setConfirmModal({
            label: `Delete team "${team.Name}" from ${team.DivisionName}?`,
            details: 'This removes the team and all its scheduled games.',
            onConfirm: () => doDeleteTeam(team.ScheduledTeamID),
          })}
          onDeleteDivision={div => setConfirmModal({
            label: `Delete division "${div.name}"?`,
            details: `This will delete all ${teamsByDivision[div.id] || 0} team(s) and their games.`,
            onConfirm: () => doDeleteDivision(div.id),
          })}
          onDeleteLeague={league => setConfirmModal({
            label: `Delete entire league "${league.name}"?`,
            details: `This will delete all ${teamsByLeague[league.id] || 0} team(s), divisions, seasons, and games.`,
            onConfirm: () => doDeleteLeague(league.id),
          })}
          onDeleteSeason={season => setConfirmModal({
            label: `Delete season "${season.name}"?`,
            details: 'This will delete all teams and games in this season.',
            onConfirm: () => doDeleteSeason(season.id),
          })}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          label={confirmModal.label}
          details={confirmModal.details}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          busy={deleting}
        />
      )}

      {editGame && (
        <GameEditModal
          game={editGame}
          teams={teams}
          form={editForm}
          onChange={setEditForm}
          onSave={saveEdit}
          onDelete={() => {
            const g = editGame
            setEditGame(null)
            setConfirmModal({
              label: `Delete game on ${formatDate(g.GameDate)}: ${g.HomeTeamName} vs ${g.AwayTeamName}?`,
              details: 'This removes the game permanently.',
              onConfirm: () => doDeleteGame(g.GameID),
            })
          }}
          onCancel={() => setEditGame(null)}
          saving={savingEdit}
        />
      )}
    </div>
  )
}

// ─── Conflict Panel ────────────────────────────────────────────────────────────

function ConflictPanel({ conflicts, onEditGame }) {
  const [open, setOpen] = useState(true)
  if (conflicts.length === 0) return null

  return (
    <div className="mb-5 border border-red-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-red-900/40 hover:bg-red-900/60 transition text-left"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold shrink-0">
          {conflicts.length}
        </span>
        <span className="text-red-300 font-semibold text-sm">
          {conflicts.length} Schedule Conflict{conflicts.length !== 1 ? 's' : ''} Detected
        </span>
        <span className="ml-auto text-red-400 text-xs">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {open && (
        <div className="divide-y divide-red-900/40 bg-red-950/20">
          {conflicts.map((c, i) => (
            <div key={i} className="px-4 py-3">
              <p className="text-red-200 text-sm font-medium mb-2">
                {c.type === 'team'
                  ? `⚠ Team double-booked on ${formatDate(c.date)}: ${c.teamName} has ${c.games.length} games`
                  : `⚠ Rink double-booked: ${c.rink} on ${formatDate(c.date)} at ${c.time}`
                }
              </p>
              <div className="ml-4 space-y-1.5">
                {c.games.map(g => (
                  <div key={g.GameID} className="flex items-center gap-3">
                    <span className="text-gray-300 text-xs flex-1">
                      Game #{g.GameID}: {g.HomeTeamName} vs {g.AwayTeamName}
                      {g.GameTime && <span className="text-gray-500 ml-2">· {g.GameTime}</span>}
                      {g.Rink && <span className="text-gray-500 ml-1">@ {g.Rink}</span>}
                      <span className="text-gray-600 ml-2">({g.DivisionName})</span>
                    </span>
                    <button
                      onClick={() => onEditGame(g)}
                      className="text-xs text-blue-400 hover:text-blue-300 underline shrink-0 transition"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Calendar Tab ──────────────────────────────────────────────────────────────

function CalendarTab({
  filteredGames, calEvents,
  uniqueLeagues, uniqueDivisions, uniqueSeasons,
  leagueFilter, setLeagueFilter,
  divisionFilter, setDivisionFilter,
  seasonFilter, setSeasonFilter,
  statusFilter, setStatusFilter,
  onEventClick, onEventDrop,
  conflicts, onEditGame, onBulkDelete,
}) {
  const hasFilter = leagueFilter || divisionFilter || seasonFilter || statusFilter
  return (
    <div>
      <ConflictPanel conflicts={conflicts} onEditGame={onEditGame} />

      <div className="flex flex-wrap gap-3 items-center mb-5">
        <span className="text-gray-400 text-sm">
          {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-2 ml-auto flex-wrap items-center">
          <select value={leagueFilter} onChange={e => setLeagueFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
            <option value="">All Leagues</option>
            {uniqueLeagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
            <option value="">All Divisions</option>
            {uniqueDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {uniqueSeasons.length > 0 && (
            <select value={seasonFilter} onChange={e => setSeasonFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
              <option value="">All Seasons</option>
              {uniqueSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
          </select>
          {hasFilter && filteredGames.length > 0 && (
            <button
              onClick={() => onBulkDelete(filteredGames)}
              className="bg-red-800 hover:bg-red-700 border border-red-600 text-red-200 hover:text-white text-sm px-3 py-1.5 rounded transition font-medium"
            >
              Delete {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 admin-cal">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={calEvents}
          editable={true}
          eventDrop={onEventDrop}
          eventClick={onEventClick}
          height="auto"
          eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
          eventDisplay="block"
        />
      </div>
      <p className="text-gray-500 text-xs mt-2">
        Click a game to edit or delete it. Drag it to a different date to move it.
      </p>
    </div>
  )
}

// ─── Structure Tab ─────────────────────────────────────────────────────────────

function StructureTab({
  leagues, divisions, seasons, teams,
  teamsByDivision, teamsByLeague,
  onDeleteTeam, onDeleteDivision, onDeleteLeague, onDeleteSeason,
}) {
  if (!leagues || leagues.length === 0) {
    return (
      <div className="text-gray-500 py-12 text-center">
        No active leagues found. Save teams in Schedule Manager first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-500 text-sm">
        Showing only leagues with active teams. Delete operations cascade — removing a league deletes all its divisions, seasons, teams, and games.
      </p>
      {leagues.map(league => {
        const leagueDivisions = divisions.filter(d => d.leagueID === league.id && (teamsByDivision[d.id] || 0) > 0)
        const leagueSeasons = seasons.filter(s => s.leagueID === league.id)
        const teamCount = teamsByLeague[league.id] || 0

        return (
          <div key={league.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
              <div className="flex-1">
                <span className="text-white font-semibold">{league.name}</span>
                <span className="ml-3 text-gray-500 text-xs">
                  {leagueDivisions.length} division{leagueDivisions.length !== 1 ? 's' : ''} · {leagueSeasons.length} season{leagueSeasons.length !== 1 ? 's' : ''} · {teamCount} team{teamCount !== 1 ? 's' : ''}
                </span>
              </div>
              <button onClick={() => onDeleteLeague(league)}
                className="text-red-500 hover:text-red-400 text-xs px-3 py-1.5 rounded border border-red-800 hover:border-red-600 transition">
                Delete League
              </button>
            </div>

            {leagueDivisions.length > 0 && (
              <div className="divide-y divide-gray-700">
                {leagueDivisions.map(div => {
                  const divTeams = teams.filter(t => t.DivisionID === div.id)
                  return (
                    <div key={div.id}>
                      <div className="flex items-center gap-3 px-6 py-3 bg-gray-900/30">
                        <div className="flex-1">
                          <span className="text-gray-200 font-medium">{div.name}</span>
                          <span className="ml-3 text-gray-500 text-xs">
                            {divTeams.length} team{divTeams.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <button onClick={() => onDeleteDivision(div)}
                          className="text-red-500 hover:text-red-400 text-xs px-3 py-1.5 rounded border border-red-800 hover:border-red-600 transition">
                          Delete Division
                        </button>
                      </div>
                      {divTeams.map(team => (
                        <div key={team.ScheduledTeamID}
                          className="flex items-center gap-3 px-10 py-2 border-t border-gray-700/40">
                          <span className="text-gray-300 text-sm flex-1">{team.Name}</span>
                          <span className="text-gray-500 text-xs">{team.SeasonName}</span>
                          <button onClick={() => onDeleteTeam(team)}
                            className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded border border-red-900 hover:border-red-700 transition">
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {leagueSeasons.length > 0 && (
              <div className="border-t border-gray-700 divide-y divide-gray-700">
                {leagueSeasons.map(season => (
                  <div key={season.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex-1">
                      <span className="text-gray-400 text-sm">Season: </span>
                      <span className="text-white text-sm font-medium">{season.name}</span>
                    </div>
                    <button onClick={() => onDeleteSeason(season)}
                      className="text-red-500 hover:text-red-400 text-xs px-3 py-1.5 rounded border border-red-800 hover:border-red-600 transition">
                      Delete Season
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
