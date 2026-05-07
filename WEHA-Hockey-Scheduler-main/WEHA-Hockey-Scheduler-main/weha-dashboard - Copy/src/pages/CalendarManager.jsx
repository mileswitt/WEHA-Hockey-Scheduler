import { useState, useEffect, useCallback } from 'react'
import { getAuthToken, AUTH_HEADER_KEY } from '../context/Authentication'

function authHeaders() {
  return { [AUTH_HEADER_KEY]: getAuthToken(), 'Content-Type': 'application/json' }
}

function formatDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${m}/${d}/${y}`
}

function formatTime(str) {
  if (!str) return ''
  const [h, mi] = str.split(':')
  const hr = parseInt(h, 10)
  return `${hr % 12 || 12}:${mi} ${hr >= 12 ? 'PM' : 'AM'}`
}

function StatusBadge({ status }) {
  const color = status === 'Scheduled' ? 'bg-green-700 text-green-200' : 'bg-yellow-800 text-yellow-200'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}>{status}</span>
}

function ConfirmModal({ label, details, onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 className="text-white font-semibold text-lg mb-2">Confirm Delete</h3>
        <p className="text-gray-300 mb-1">{label}</p>
        {details && <p className="text-red-400 text-sm mb-5">{details}</p>}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded font-medium transition"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function EditGameModal({ game, teams, form, onChange, onSave, onCancel, saving }) {
  // Filter teams to same division as the original game's home team
  const divisionID = teams.find(t => t.ScheduledTeamID === game.HomeTeamID)?.DivisionID
  const divTeams = divisionID ? teams.filter(t => t.DivisionID === divisionID) : teams

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-lg mx-4 shadow-2xl">
        <h3 className="text-white font-semibold text-lg mb-4">Edit Game</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Home Team</label>
              <select
                value={form.HomeTeamID}
                onChange={e => onChange({ ...form, HomeTeamID: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              >
                {divTeams.map(t => (
                  <option key={t.ScheduledTeamID} value={t.ScheduledTeamID}>{t.Name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Away Team</label>
              <select
                value={form.AwayTeamID}
                onChange={e => onChange({ ...form, AwayTeamID: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              >
                {divTeams.map(t => (
                  <option key={t.ScheduledTeamID} value={t.ScheduledTeamID}>{t.Name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Date</label>
              <input
                type="date"
                value={form.GameDate}
                onChange={e => onChange({ ...form, GameDate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Time</label>
              <input
                type="time"
                value={form.GameTime}
                onChange={e => onChange({ ...form, GameTime: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Rink</label>
              <input
                type="text"
                value={form.Rink}
                onChange={e => onChange({ ...form, Rink: e.target.value })}
                placeholder="Rink name"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Status</label>
              <select
                value={form.CurrentGameStatus}
                onChange={e => onChange({ ...form, CurrentGameStatus: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="Draft">Draft</option>
                <option value="Scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded font-medium transition"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CalendarManager() {
  const [tab, setTab] = useState('teams')
  const [teams, setTeams] = useState([])
  const [leaguesData, setLeaguesData] = useState({ leagues: [], divisions: [], seasons: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Teams tab state
  const [leagueFilter, setLeagueFilter] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')
  const [expandedTeamId, setExpandedTeamId] = useState(null)
  const [teamGames, setTeamGames] = useState({})
  const [loadingGames, setLoadingGames] = useState(false)

  // Edit game modal
  const [editGame, setEditGame] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete confirmation
  const [confirmModal, setConfirmModal] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [teamsRes, leaguesRes] = await Promise.all([
        fetch('/api/scheduled-teams'),
        fetch('/api/leagues-divisions'),
      ])
      const [teamsData, leaguesJson] = await Promise.all([teamsRes.json(), leaguesRes.json()])
      setTeams(Array.isArray(teamsData) ? teamsData : [])
      setLeaguesData(leaguesJson && typeof leaguesJson === 'object' ? leaguesJson : { leagues: [], divisions: [], seasons: [] })
      setTeamGames({})
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

  async function expandTeam(teamId) {
    if (expandedTeamId === teamId) { setExpandedTeamId(null); return }
    setExpandedTeamId(teamId)
    if (teamGames[teamId] !== undefined) return
    setLoadingGames(true)
    try {
      const res = await fetch(`/api/games?teamID=${teamId}`)
      const data = await res.json()
      setTeamGames(prev => ({ ...prev, [teamId]: Array.isArray(data) ? data : [] }))
    } catch {
      setTeamGames(prev => ({ ...prev, [teamId]: [] }))
    } finally {
      setLoadingGames(false)
    }
  }

  async function refreshTeamGames(teamId) {
    const res = await fetch(`/api/games?teamID=${teamId}`)
    const data = await res.json()
    setTeamGames(prev => ({ ...prev, [teamId]: Array.isArray(data) ? data : [] }))
  }

  async function doDeleteGame(game) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/games/${game.GameID}`, {
        method: 'DELETE',
        headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      if (!res.ok) throw new Error('Failed to delete game')
      // Remove from caches for both teams involved
      setTeamGames(prev => {
        const n = { ...prev }
        ;[game.HomeTeamID, game.AwayTeamID].forEach(tid => {
          if (n[tid]) n[tid] = n[tid].filter(g => g.GameID !== game.GameID)
        })
        return n
      })
      flashSuccess('Game deleted')
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
      setConfirmModal(null)
    }
  }

  async function doDeleteTeam(teamId) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/scheduled-teams/${teamId}`, {
        method: 'DELETE',
        headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      if (!res.ok) throw new Error('Failed to delete team')
      setTeams(prev => prev.filter(t => t.ScheduledTeamID !== teamId))
      setTeamGames(prev => { const n = { ...prev }; delete n[teamId]; return n })
      if (expandedTeamId === teamId) setExpandedTeamId(null)
      flashSuccess('Team and all its games deleted')
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
      setConfirmModal(null)
    }
  }

  async function doDeleteDivision(divisionId) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/division/${divisionId}`, {
        method: 'DELETE',
        headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      await loadData()
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
        method: 'DELETE',
        headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      await loadData()
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
        method: 'DELETE',
        headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      await loadData()
      flashSuccess('Season deleted')
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
      setConfirmModal(null)
    }
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
      // Invalidate caches for all affected teams
      const affected = new Set([editGame.HomeTeamID, editGame.AwayTeamID, editForm.HomeTeamID, editForm.AwayTeamID])
      setTeamGames(prev => { const n = { ...prev }; affected.forEach(id => delete n[id]); return n })
      if (expandedTeamId && affected.has(expandedTeamId)) await refreshTeamGames(expandedTeamId)
      setEditGame(null)
      flashSuccess('Game updated')
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingEdit(false)
    }
  }

  // Derived values
  const uniqueLeagues = [...new Map(teams.map(t => [t.LeagueID, { id: t.LeagueID, name: t.LeagueName }])).values()]
  const filteredDivisions = leagueFilter
    ? [...new Map(teams.filter(t => t.LeagueID === Number(leagueFilter)).map(t => [t.DivisionID, { id: t.DivisionID, name: t.DivisionName }])).values()]
    : [...new Map(teams.map(t => [t.DivisionID, { id: t.DivisionID, name: t.DivisionName }])).values()]

  const filteredTeams = teams.filter(t => {
    if (leagueFilter && t.LeagueID !== Number(leagueFilter)) return false
    if (divisionFilter && t.DivisionID !== Number(divisionFilter)) return false
    return true
  })

  // Group by league then division
  const grouped = filteredTeams.reduce((acc, t) => {
    if (!acc[t.LeagueID]) acc[t.LeagueID] = { leagueID: t.LeagueID, name: t.LeagueName, divisions: {} }
    if (!acc[t.LeagueID].divisions[t.DivisionID]) {
      acc[t.LeagueID].divisions[t.DivisionID] = { divisionID: t.DivisionID, name: t.DivisionName, teams: [] }
    }
    acc[t.LeagueID].divisions[t.DivisionID].teams.push(t)
    return acc
  }, {})

  // Team lookup for edit modal + opponent display
  const teamMap = Object.fromEntries(teams.map(t => [t.ScheduledTeamID, t]))

  // Per-division and per-league team counts for the structure tab
  const teamsByDivision = teams.reduce((acc, t) => { acc[t.DivisionID] = (acc[t.DivisionID] || 0) + 1; return acc }, {})
  const teamsByLeague   = teams.reduce((acc, t) => { acc[t.LeagueID]   = (acc[t.LeagueID]   || 0) + 1; return acc }, {})

  const { leagues = [], divisions = [], seasons = [] } = leaguesData

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Calendar Manager</h1>
      <p className="text-gray-400 text-sm mb-6">View and manage every team, game, and division on the calendar.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-lg w-fit">
        {[['teams', 'Teams on Calendar'], ['structure', 'Leagues & Divisions']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${tab === key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Global status messages */}
      {error   && <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded text-sm">{error}<button className="ml-3 underline" onClick={() => setError('')}>Dismiss</button></div>}
      {success && <div className="mb-4 bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded text-sm">{success}</div>}

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : tab === 'teams' ? (
        <TeamsTab
          grouped={grouped}
          teams={teams}
          uniqueLeagues={uniqueLeagues}
          filteredDivisions={filteredDivisions}
          leagueFilter={leagueFilter}
          setLeagueFilter={v => { setLeagueFilter(v); setDivisionFilter('') }}
          divisionFilter={divisionFilter}
          setDivisionFilter={setDivisionFilter}
          expandedTeamId={expandedTeamId}
          expandTeam={expandTeam}
          teamGames={teamGames}
          loadingGames={loadingGames}
          teamMap={teamMap}
          onEditGame={game => {
            setEditGame(game)
            setEditForm({
              HomeTeamID: game.HomeTeamID,
              AwayTeamID: game.AwayTeamID,
              GameDate: game.GameDate,
              GameTime: game.GameTime,
              Rink: game.Rink || '',
              CurrentGameStatus: game.CurrentGameStatus,
            })
          }}
          onDeleteGame={game => setConfirmModal({
            label: `Delete game on ${formatDate(game.GameDate)}: ${game.HomeTeamName} vs ${game.AwayTeamName}?`,
            details: 'This removes the game from the calendar permanently.',
            onConfirm: () => doDeleteGame(game),
          })}
          onDeleteTeam={team => setConfirmModal({
            label: `Delete team "${team.Name}" from ${team.DivisionName}?`,
            details: 'This removes the team and all its scheduled games from the site.',
            onConfirm: () => doDeleteTeam(team.ScheduledTeamID),
          })}
        />
      ) : (
        <StructureTab
          leagues={leagues}
          divisions={divisions}
          seasons={seasons}
          teamsByDivision={teamsByDivision}
          teamsByLeague={teamsByLeague}
          onDeleteDivision={(div) => setConfirmModal({
            label: `Delete division "${div.name}"?`,
            details: `This will delete all ${teamsByDivision[div.id] || 0} team(s) and their games in this division.`,
            onConfirm: () => doDeleteDivision(div.id),
          })}
          onDeleteLeague={(league) => setConfirmModal({
            label: `Delete entire league "${league.name}"?`,
            details: `This will delete all ${teamsByLeague[league.id] || 0} team(s), all divisions, all seasons, and all games in this league.`,
            onConfirm: () => doDeleteLeague(league.id),
          })}
          onDeleteSeason={(season) => setConfirmModal({
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
        <EditGameModal
          game={editGame}
          teams={teams}
          form={editForm}
          onChange={setEditForm}
          onSave={saveEdit}
          onCancel={() => setEditGame(null)}
          saving={savingEdit}
        />
      )}
    </div>
  )
}

// ─── Teams Tab ───────────────────────────────────────────────────────────────

function TeamsTab({
  grouped, teams, uniqueLeagues, filteredDivisions,
  leagueFilter, setLeagueFilter, divisionFilter, setDivisionFilter,
  expandedTeamId, expandTeam, teamGames, loadingGames, teamMap,
  onEditGame, onDeleteGame, onDeleteTeam,
}) {
  const teamsWithGames = teams.filter(t => t.hasGames).length

  return (
    <div>
      {/* Summary + filters */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <span className="text-gray-400 text-sm">{teams.length} teams total &mdash; {teamsWithGames} have games on calendar</span>
        <div className="flex gap-2 ml-auto">
          <select
            value={leagueFilter}
            onChange={e => setLeagueFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
          >
            <option value="">All Leagues</option>
            {uniqueLeagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select
            value={divisionFilter}
            onChange={e => setDivisionFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
          >
            <option value="">All Divisions</option>
            {filteredDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {Object.values(grouped).length === 0 ? (
        <div className="text-gray-500 py-12 text-center">No teams match the current filters.</div>
      ) : (
        <div className="space-y-6">
          {Object.values(grouped).map(league => (
            <div key={league.leagueID}>
              <h2 className="text-red-400 font-semibold text-sm uppercase tracking-wider mb-3">{league.name}</h2>
              <div className="space-y-4">
                {Object.values(league.divisions).map(div => (
                  <div key={div.divisionID}>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2 ml-1">{div.name}</h3>
                    <div className="space-y-2">
                      {div.teams.map(team => (
                        <TeamRow
                          key={team.ScheduledTeamID}
                          team={team}
                          expanded={expandedTeamId === team.ScheduledTeamID}
                          games={teamGames[team.ScheduledTeamID]}
                          loadingGames={loadingGames && expandedTeamId === team.ScheduledTeamID}
                          teamMap={teamMap}
                          onExpand={() => expandTeam(team.ScheduledTeamID)}
                          onEditGame={onEditGame}
                          onDeleteGame={onDeleteGame}
                          onDeleteTeam={() => onDeleteTeam(team)}
                        />
                      ))}
                    </div>
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

function TeamRow({ team, expanded, games, loadingGames, teamMap, onExpand, onEditGame, onDeleteGame, onDeleteTeam }) {
  const gameCount = games ? games.length : (team.hasGames ? '?' : 0)

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      {/* Team header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onExpand}
          className="text-gray-400 hover:text-white transition w-5 text-center text-sm flex-shrink-0"
          title={expanded ? 'Collapse' : 'Expand games'}
        >
          {expanded ? '▼' : '▶'}
        </button>

        <div className="flex-1 min-w-0">
          <span className="text-white font-medium">{team.Name}</span>
          <span className="ml-3 text-xs text-gray-500">
            {typeof gameCount === 'number' ? `${gameCount} game${gameCount !== 1 ? 's' : ''}` : `${gameCount} games`}
            {team.hasGames ? '' : ' · no games scheduled'}
          </span>
        </div>

        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded hidden sm:inline">{team.SeasonName}</span>

        <button
          onClick={onDeleteTeam}
          className="text-red-500 hover:text-red-400 text-xs px-3 py-1.5 rounded border border-red-800 hover:border-red-600 transition flex-shrink-0"
          title="Delete team and all its games"
        >
          Delete Team
        </button>
      </div>

      {/* Expanded games list */}
      {expanded && (
        <div className="border-t border-gray-700">
          {loadingGames ? (
            <div className="px-4 py-4 text-gray-500 text-sm">Loading games…</div>
          ) : !games || games.length === 0 ? (
            <div className="px-4 py-4 text-gray-500 text-sm">No games found for this team.</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {games.map(game => {
                const isHome = game.HomeTeamID === team.ScheduledTeamID
                const opponentID = isHome ? game.AwayTeamID : game.HomeTeamID
                const opponent = teamMap[opponentID]
                return (
                  <div key={game.GameID} className="flex flex-wrap gap-3 items-center px-6 py-3 hover:bg-gray-750">
                    <span className="text-gray-300 text-sm w-24 flex-shrink-0">{formatDate(game.GameDate)}</span>
                    <span className="text-gray-400 text-sm w-20 flex-shrink-0">{formatTime(game.GameTime)}</span>
                    <span className="text-white text-sm flex-1">
                      <span className="text-gray-500 text-xs mr-1">{isHome ? 'vs' : '@'}</span>
                      {opponent ? opponent.Name : `Team #${opponentID}`}
                    </span>
                    {game.Rink && <span className="text-gray-500 text-xs">{game.Rink}</span>}
                    <StatusBadge status={game.CurrentGameStatus} />
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => onEditGame(game)}
                        className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded border border-blue-800 hover:border-blue-600 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteGame(game)}
                        className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded border border-red-900 hover:border-red-700 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Structure Tab ────────────────────────────────────────────────────────────

function StructureTab({ leagues, divisions, seasons, teamsByDivision, teamsByLeague, onDeleteDivision, onDeleteLeague, onDeleteSeason }) {
  if (!leagues || leagues.length === 0) {
    return <div className="text-gray-500 py-12 text-center">No leagues found in the database.</div>
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-500 text-sm">Delete operations cascade — removing a league deletes all its divisions, seasons, teams, and games.</p>
      {leagues.map(league => {
        const leagueDivisions = divisions.filter(d => d.leagueID === league.id)
        const leagueSeasons   = seasons.filter(s => s.leagueID === league.id)
        const teamCount       = teamsByLeague[league.id] || 0

        return (
          <div key={league.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            {/* League header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-750 border-b border-gray-700">
              <div className="flex-1">
                <span className="text-white font-semibold">{league.name}</span>
                <span className="ml-3 text-gray-500 text-xs">
                  {leagueDivisions.length} division{leagueDivisions.length !== 1 ? 's' : ''} · {leagueSeasons.length} season{leagueSeasons.length !== 1 ? 's' : ''} · {teamCount} team{teamCount !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => onDeleteLeague(league)}
                className="text-red-500 hover:text-red-400 text-xs px-3 py-1.5 rounded border border-red-800 hover:border-red-600 transition"
              >
                Delete League
              </button>
            </div>

            {/* Divisions */}
            {leagueDivisions.length > 0 && (
              <div className="divide-y divide-gray-700">
                {leagueDivisions.map(div => {
                  const tc = teamsByDivision[div.id] || 0
                  return (
                    <div key={div.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="flex-1">
                        <span className="text-gray-200">Division: </span>
                        <span className="text-white font-medium">{div.name}</span>
                        <span className="ml-3 text-gray-500 text-xs">{tc} team{tc !== 1 ? 's' : ''}</span>
                      </div>
                      <button
                        onClick={() => onDeleteDivision(div)}
                        className="text-red-500 hover:text-red-400 text-xs px-3 py-1.5 rounded border border-red-800 hover:border-red-600 transition"
                      >
                        Delete Division
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Seasons */}
            {leagueSeasons.length > 0 && (
              <div className="border-t border-gray-700 divide-y divide-gray-700">
                {leagueSeasons.map(season => (
                  <div key={season.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex-1">
                      <span className="text-gray-200">Season: </span>
                      <span className="text-white font-medium">{season.name}</span>
                    </div>
                    <button
                      onClick={() => onDeleteSeason(season)}
                      className="text-red-500 hover:text-red-400 text-xs px-3 py-1.5 rounded border border-red-800 hover:border-red-600 transition"
                    >
                      Delete Season
                    </button>
                  </div>
                ))}
              </div>
            )}

            {leagueDivisions.length === 0 && leagueSeasons.length === 0 && (
              <div className="px-6 py-3 text-gray-600 text-sm">No divisions or seasons.</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
