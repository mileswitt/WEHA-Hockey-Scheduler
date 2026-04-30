import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Utilities ────────────────────────────────────────────────────────────────

function posBadge(pos) {
  if (pos === 'G') return 'bg-yellow-600 text-yellow-100'
  if (pos === 'D') return 'bg-blue-700 text-blue-100'
  return 'bg-gray-600 text-gray-200'
}

function recalcTeam(team) {
  const size = team.players.length
  const fieldPlayers = team.players.filter(p => !p.isGoalie)
  const total = fieldPlayers.reduce((s, p) => s + (p.skill ?? 0), 0)
  const avg = fieldPlayers.length > 0 ? Math.round((total / fieldPlayers.length) * 1000) / 1000 : 0
  return { ...team, size, avg_skill: avg, avg_experience: avg, hasGoalie: team.players.some(p => p.isGoalie) }
}

// Infer next season name by incrementing the year(s) found in the last season's name
function inferNextSeasonName(lastSeasonName, leagueName) {
  if (!lastSeasonName) return `Regular Season - ${leagueName} ${new Date().getFullYear() + 1}`
  // "2022-2023" → "2023-2024"
  const rangeMatch = lastSeasonName.match(/(\d{4})-(\d{4})/)
  if (rangeMatch) {
    const y1 = parseInt(rangeMatch[1]), y2 = parseInt(rangeMatch[2])
    return lastSeasonName.replace(`${y1}-${y2}`, `${y1 + 1}-${y2 + 1}`)
  }
  // "2025" → "2026"
  const singleMatch = lastSeasonName.match(/\b(\d{4})\b/)
  if (singleMatch) {
    const y = parseInt(singleMatch[1])
    return lastSeasonName.replace(String(y), String(y + 1))
  }
  return `${lastSeasonName} (Next)`
}

// ─── Edit Player Modal ────────────────────────────────────────────────────────

function EditPlayerModal({ player, onSave, onClose }) {
  const [form, setForm] = useState({
    position:    player.position    ?? '',
    goals:       player.goals       ?? '',
    assists:     player.assists     ?? '',
    gamesPlayed: player.gamesPlayed ?? '',
    gaa:         player.gaa         ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const res  = await fetch(`/api/player/${player.playerID}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Save failed.'); setSaving(false); return }
      onSave(player.playerID, form)
    } catch { setError('Could not connect to server.') }
    setSaving(false)
  }

  const isGoalie = form.position === 'G' || player.isGoalie

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h3 className="text-white font-semibold">Edit Player Stats</h3>
            <p className="text-gray-400 text-xs mt-0.5">{player.name} · ID {player.playerID}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {error && <p className="text-red-400 text-sm bg-red-900/30 border border-red-700 rounded p-2">{error}</p>}
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Position</label>
            <select value={form.position} onChange={e => set('position', e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm">
              <option value="">Unknown / Forward</option>
              <option value="G">G — Goalie</option>
              <option value="D">D — Defence</option>
              <option value="F">F — Forward</option>
            </select>
          </div>
          {isGoalie ? (
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Goals Against Average (GAA)</label>
              <input type="number" min={0} max={15} step={0.01} value={form.gaa}
                onChange={e => set('gaa', e.target.value)} placeholder="e.g. 2.45"
                className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[['Goals', 'goals'], ['Assists', 'assists'], ['Games Played', 'gamesPlayed']].map(([label, key]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{label}</label>
                  <input type="number" min={0} step={1} value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 bg-gray-700/40 rounded p-2">
            Current skill: <span className="text-white">{player.skill?.toFixed(3) ?? '—'}</span>
            <span className="ml-2 text-gray-600">· recalculates after save</span>
          </p>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded transition">
            {saving ? 'Saving…' : 'Save to Database'}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Data Quality Panel ───────────────────────────────────────────────────────

function DataQualityPanel({ leagueObj, divisionObj, seasonID, dismissed, onDismiss, onEdit, changeLog }) {
  const [checking, setChecking] = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)

  const runCheck = useCallback(async () => {
    if (!leagueObj) return
    setChecking(true); setError(null)
    const p = new URLSearchParams({ league_name: leagueObj.name })
    if (divisionObj) p.set('division_name', divisionObj.name)
    if (seasonID)    p.set('season_id', seasonID)
    try {
      const res  = await fetch(`/api/data-quality?${p}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error); setChecking(false); return }
      setResult(data)
    } catch { setError('Could not reach server.') }
    setChecking(false)
  }, [leagueObj, divisionObj, seasonID])

  // Reset when filters change
  const prevKey = useRef(null)
  useEffect(() => {
    const key = `${leagueObj?.id}-${divisionObj?.id}-${seasonID}`
    if (key !== prevKey.current) { prevKey.current = key; setResult(null) }
  }, [leagueObj, divisionObj, seasonID])

  const visible = result?.issues.filter(i => !dismissed.has(i.id ?? (i.playerID + i.type))) ?? []
  const warnings = visible.filter(i => i.severity === 'warning').length
  const infos    = visible.filter(i => i.severity === 'info').length

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="font-semibold text-white">Data Quality Check</h2>
          <p className="text-gray-400 text-xs mt-0.5">
            Scans for duplicate names, missing stats, and anomalous data before generating.
          </p>
        </div>
        <button onClick={runCheck} disabled={checking || !leagueObj}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition shrink-0">
          {checking ? 'Scanning…' : result ? '↻ Re-scan' : 'Run Check'}
        </button>
      </div>

      {error && <p className="mx-5 mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded text-sm">{error}</p>}

      {result && (
        <div className="border-t border-gray-700">
          {/* Summary strip */}
          <div className="flex items-center gap-5 px-5 py-3 bg-gray-700/40 text-sm flex-wrap">
            <span className="text-gray-400">{result.total} players scanned</span>
            {warnings > 0
              ? <span className="text-yellow-400 font-medium">⚠ {warnings} warning{warnings !== 1 ? 's' : ''}</span>
              : <span className="text-green-400">✓ No warnings</span>}
            {infos > 0 && <span className="text-blue-300">ℹ {infos} note{infos !== 1 ? 's' : ''}</span>}
            {dismissed.size > 0 && <span className="text-gray-500">{dismissed.size} dismissed</span>}
            {changeLog.length > 0 && <span className="text-green-400">✏ {changeLog.length} edited this session</span>}
          </div>

          {visible.length > 0 ? (
            <ul className="divide-y divide-gray-700/60">
              {visible.map((issue, idx) => {
                const isWarn = issue.severity === 'warning'
                const issueKey = issue.id ?? (issue.playerID + issue.type)
                return (
                  <li key={issueKey + idx}
                    className={`px-5 py-3 ${isWarn ? 'bg-yellow-900/15' : 'bg-blue-900/10'}`}>

                    {/* Grouped duplicate-name issue */}
                    {issue.grouped && issue.type === 'duplicate_name' ? (
                      <div className="flex flex-wrap items-start gap-3">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-700 text-blue-100 mt-0.5 shrink-0">ℹ NOTE</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">
                            {issue.players.length} players named &ldquo;{issue.name}&rdquo;
                          </p>
                          <div className="flex gap-2 flex-wrap mt-1">
                            {issue.players.map(p => (
                              <span key={p.playerID} className="text-xs bg-gray-700 text-gray-300 rounded px-2 py-0.5">
                                ID {p.playerID} · {p.teamName}
                              </span>
                            ))}
                          </div>
                          <p className="text-gray-400 text-xs mt-1">{issue.message}</p>
                        </div>
                        <button onClick={() => onDismiss(issueKey)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-1 rounded transition shrink-0">
                          Got it
                        </button>
                      </div>
                    ) : (
                      /* Regular single-player issue */
                      <div className="flex flex-wrap items-start gap-3">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${isWarn ? 'bg-yellow-600 text-yellow-100' : 'bg-blue-700 text-blue-100'}`}>
                          {isWarn ? '⚠ WARN' : 'ℹ INFO'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {issue.name}
                            <span className="text-gray-500 text-xs ml-2 font-normal">#{issue.playerID}</span>
                          </p>
                          <p className="text-gray-400 text-xs mt-0.5">{issue.message}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => onEdit(issue.profile)}
                            className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2.5 py-1 rounded transition">
                            Edit Stats
                          </button>
                          <button onClick={() => onDismiss(issueKey)}
                            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-1 rounded transition">
                            Ignore
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-5 py-4 text-green-400 text-sm">✓ All issues resolved or dismissed. Safe to generate.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Season creator ───────────────────────────────────────────────────────────

function CreateSeasonForm({ leagueObj, latestSeasonName, onCreated, onCancel }) {
  const [name,    setName]    = useState(() => inferNextSeasonName(latestSeasonName, leagueObj?.name || ''))
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) { setError('Season name is required.'); return }
    setSaving(true); setError(null)
    try {
      const res  = await fetch('/api/season', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), leagueID: leagueObj.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create season.'); setSaving(false); return }
      onCreated(data.season)
    } catch { setError('Could not connect to server.') }
    setSaving(false)
  }

  return (
    <div className="col-span-full mt-2 p-4 bg-gray-700/60 border border-gray-600 rounded-lg flex flex-col gap-3">
      <p className="text-white text-sm font-medium">New Season Name</p>
      <p className="text-gray-400 text-xs -mt-1">
        Pre-filled based on the most recent season for this league. Edit as needed.
      </p>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        <input value={name} onChange={e => { setName(e.target.value); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="flex-1 min-w-0 bg-gray-800 border border-gray-600 focus:border-blue-400 text-white rounded px-3 py-2 text-sm focus:outline-none transition" />
        <button onClick={handleCreate} disabled={saving}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm px-5 py-2 rounded transition shrink-0">
          {saving ? 'Creating…' : 'Create Season'}
        </button>
        <button onClick={onCancel}
          className="bg-gray-600 hover:bg-gray-500 text-white text-sm px-4 py-2 rounded transition shrink-0">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Team card ────────────────────────────────────────────────────────────────

function TeamCard({ label, team }) {
  const goalie = team.players.find(p => p.isGoalie)
  const field  = team.players.filter(p => !p.isGoalie)
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-white">{label}</span>
        <span className="text-xs text-gray-400">
          Avg <span className="text-white font-medium">{team.avg_skill?.toFixed(3) ?? '—'}</span>
          &nbsp;·&nbsp;{team.players.length}p
        </span>
      </div>
      <ul className="divide-y divide-gray-700">
        {goalie ? (
          <li className="flex items-center gap-3 px-4 py-2 bg-yellow-900/20">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${posBadge('G')}`}>G</span>
            <span className="text-white text-sm flex-1 truncate">{goalie.name}</span>
            <span className="text-gray-400 text-xs">GAA {goalie.gaa != null ? Number(goalie.gaa).toFixed(2) : '—'}</span>
          </li>
        ) : (
          <li className="flex items-center gap-3 px-4 py-2 bg-red-900/20">
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-700 text-red-100">G</span>
            <span className="text-gray-500 text-sm italic">No goalie assigned</span>
          </li>
        )}
        {field.map((p, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-2">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${posBadge(p.position)}`}>{p.position || 'F'}</span>
            <span className="text-white text-sm flex-1 truncate">{p.name}</span>
            <span className="text-gray-400 text-xs whitespace-nowrap">{p.goals ?? 0}G {p.assists ?? 0}A</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Unassigned row ───────────────────────────────────────────────────────────

function UnassignedRow({ player, teamOptions, onAddToTeam }) {
  const [dest, setDest] = useState('')
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-700 last:border-0 hover:bg-gray-700/30">
      <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${posBadge(player.position)}`}>{player.position || 'F'}</span>
      <span className="text-white text-sm flex-1 min-w-0 truncate">
        {player.name}
        <span className="text-gray-500 text-xs ml-2">#{player.playerID}</span>
      </span>
      {player.isGoalie
        ? <span className="text-gray-400 text-xs whitespace-nowrap">GAA {player.gaa != null ? Number(player.gaa).toFixed(2) : '—'}</span>
        : <span className="text-gray-400 text-xs whitespace-nowrap">{player.goals ?? 0}G {player.assists ?? 0}A · {player.gamesPlayed ?? 0}GP</span>}
      <span className="text-gray-500 text-xs whitespace-nowrap">skill {player.skill?.toFixed(3) ?? '—'}</span>
      <div className="flex items-center gap-2 shrink-0">
        <select value={dest} onChange={e => setDest(e.target.value)}
          className="text-xs bg-gray-700 border border-gray-600 text-white rounded px-2 py-1">
          <option value="" disabled>Add to team…</option>
          {teamOptions.map(([key, label, size]) => (
            <option key={key} value={key}>{label} ({size}p)</option>
          ))}
        </select>
        <button onClick={() => { if (dest) onAddToTeam(player, dest) }} disabled={!dest}
          className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-2.5 py-1 rounded transition">
          Add
        </button>
      </div>
    </li>
  )
}

// ─── Unassigned section ───────────────────────────────────────────────────────

function UnassignedSection({ players, teamOptions, onAddToTeam, onAutoAssign }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-gray-800 border border-yellow-600/40 rounded-lg overflow-hidden mb-6">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-700/30 transition">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-yellow-400 font-semibold">⚠ Unassigned Players ({players.length})</span>
          <span className="text-gray-400 text-sm">
            Add them to a team manually, or auto-assign randomly.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onAutoAssign() }}
            className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded transition font-medium"
          >
            Auto-assign all
          </button>
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <ul className="border-t border-gray-700">
          {players.map(p => (
            <UnassignedRow key={p.playerID} player={p} teamOptions={teamOptions} onAddToTeam={onAddToTeam} />
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Change log ───────────────────────────────────────────────────────────────

function ChangeLog({ entries }) {
  const [open, setOpen] = useState(true)
  if (entries.length === 0) return null
  return (
    <div className="bg-gray-800 border border-green-700/40 rounded-lg overflow-hidden mt-6">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-700/30 transition">
        <span className="text-green-400 font-medium text-sm">✏ Session Changes ({entries.length})</span>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="border-t border-gray-700 divide-y divide-gray-700/50">
          {entries.map((e, i) => (
            <li key={i} className="px-5 py-2.5 text-sm flex items-start gap-3">
              <span className="text-gray-500 text-xs mt-0.5 shrink-0 w-14">{e.time}</span>
              <span className="text-white flex-1">
                <span className="text-blue-400">{e.name}</span> — {e.field} changed from{' '}
                <span className="text-red-400">{e.oldValue ?? 'null'}</span> to{' '}
                <span className="text-green-400">{e.newValue ?? 'null'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Module-level cache for reference data ────────────────────────────────────
// Persists across component remounts (tab switches) so navigating away and back
// doesn't re-fetch and show the spinner again. Cleared on hard refresh only.
let _leagueDataCache = null

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GenerateTeams({ onTeamsGenerated }) {
  // Reference data
  const [leagues,    setLeagues]    = useState(_leagueDataCache?.leagues   ?? [])
  const [divisions,  setDivisions]  = useState(_leagueDataCache?.divisions ?? [])
  const [seasons,    setSeasons]    = useState(_leagueDataCache?.seasons   ?? [])
  const [refLoading, setRefLoading] = useState(!_leagueDataCache)
  const [refError,   setRefError]   = useState(null)

  // ── TARGET: the league + season we're CREATING teams FOR ────────────────
  const [targetLeague,   setTargetLeague]   = useState('')   // league ID
  const [targetSeason,   setTargetSeason]   = useState('')   // season ID ('' = no season yet)
  const [targetDivision, setTargetDivision] = useState('')   // optional division ID
  const [showCreateSeason, setShowCreateSeason] = useState(false)

  // League creation
  const [showCreateLeague, setShowCreateLeague] = useState(false)
  const [newLeagueName,    setNewLeagueName]    = useState('')
  const [newLeagueError,   setNewLeagueError]   = useState(null)
  const [creatingLeague,   setCreatingLeague]   = useState(false)

  // Division creation
  const [showCreateDivision, setShowCreateDivision] = useState(false)
  const [newDivisionName,    setNewDivisionName]    = useState('')
  const [newDivisionError,   setNewDivisionError]   = useState(null)
  const [creatingDivision,   setCreatingDivision]   = useState(false)

  // ── SOURCE: the season(s) we pull player data FROM ──────────────────────
  // Set of season IDs (strings). Empty = all seasons.
  const [sourceSeasonIDs, setSourceSeasonIDs] = useState(new Set())

  const [teamSize, setTeamSize] = useState(6)

  // Preview
  const [preview,        setPreview]        = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Generation
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState(null)
  const [result,     setResult]     = useState(null)

  // Mutable post-generation state
  const [localTeams,      setLocalTeams]      = useState({})
  const [localUnassigned, setLocalUnassigned] = useState([])

  // ── Debounce ref for preview fetch ───────────────────────────────────────
  const previewTimerRef = useRef(null)

  // ── Auto-assign on unmount ───────────────────────────────────────────────
  // Keep a ref that always holds the latest state needed for auto-assign,
  // so the cleanup effect (empty deps → runs only on unmount) can read fresh values.
  const autoAssignRef = useRef(null)
  useEffect(() => {
    autoAssignRef.current = { localTeams, localUnassigned, targetLeagueObj, targetDivisionObj, targetSeasonObj, onTeamsGenerated }
  })
  useEffect(() => {
    return () => {
      const ref = autoAssignRef.current
      if (!ref || !ref.localUnassigned.length || !Object.keys(ref.localTeams).length) return
      const { localTeams: teams, localUnassigned: unassigned, targetLeagueObj: lo, targetDivisionObj: dvo, targetSeasonObj: so } = ref
      const teamKeys = Object.keys(teams)
      const next = { ...teams }
      const shuffled = [...unassigned].sort(() => Math.random() - 0.5)
      shuffled.forEach((player, i) => {
        const key = teamKeys[i % teamKeys.length]
        next[key] = recalcTeam({ ...next[key], players: [...next[key].players, player] })
      })
      const ln = lo?.name || 'Unknown League'
      const dn = dvo?.name || '_unassigned'
      const seasonLabel = so ? ` (${so.name})` : ''
      ref.onTeamsGenerated?.(next, `${ln} — ${dn}${seasonLabel}`, ln, `${dn}${seasonLabel}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Data quality
  const [dismissed,     setDismissed]     = useState(new Set())
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [changeLog,     setChangeLog]     = useState([])

  // ── Load reference data (skip fetch if cache is warm) ───────────────────
  useEffect(() => {
    if (_leagueDataCache) return  // already loaded, state initialised from cache above
    fetch('/api/leagues-divisions').then(r => r.json()).then(data => {
      const cache = {
        leagues:   data.leagues   || [],
        divisions: data.divisions || [],
        seasons:   data.seasons   || [],
      }
      _leagueDataCache = cache
      setLeagues(cache.leagues)
      setDivisions(cache.divisions)
      setSeasons(cache.seasons)
      setRefLoading(false)
    }).catch(() => {
      setRefError('Could not load league data. Make sure the server is running and the database is seeded.')
      setRefLoading(false)
    })
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────
  const targetLeagueObj   = leagues.find(l => String(l.id) === String(targetLeague))
  const targetSeasonObj   = seasons.find(s => String(s.id) === String(targetSeason))
  const targetDivisionObj = divisions.find(d => String(d.id) === String(targetDivision))

  // All seasons for the target league, newest first
  const leagueSeasons = targetLeague
    ? [...seasons.filter(s => String(s.leagueID) === String(targetLeague))].sort((a, b) => b.id - a.id)
    : []
  // All seasons available as data sources — same league first, then others, newest first within each group
  const sameLeagueSrcSeasons = [...seasons]
    .filter(s => String(s.leagueID) === String(targetLeague))
    .sort((a, b) => b.id - a.id)
  const otherLeagueSrcSeasons = [...seasons]
    .filter(s => String(s.leagueID) !== String(targetLeague))
    .sort((a, b) => b.id - a.id)
  // All source options combined (used for Select All)
  const sourceSeasonOptions = [...sameLeagueSrcSeasons, ...otherLeagueSrcSeasons]
  const leagueDivisions = targetLeague ? divisions.filter(d => String(d.leagueID) === String(targetLeague)) : []

  // ── Auto-default source seasons when league changes ──────────────────────
  // Default to the most recent season for the target league
  useEffect(() => {
    if (!targetLeague) { setSourceSeasonIDs(new Set()); return }
    const leagueSpecific = [...seasons]
      .filter(s => String(s.leagueID) === String(targetLeague))
      .sort((a, b) => b.id - a.id)
    if (leagueSpecific.length > 0) {
      setSourceSeasonIDs(new Set([String(leagueSpecific[0].id)]))
    } else {
      const any = [...seasons].sort((a, b) => b.id - a.id)
      setSourceSeasonIDs(any.length > 0 ? new Set([String(any[0].id)]) : new Set())
    }
  }, [targetLeague, seasons])

  const toggleSourceSeason = (id) => {
    const sid = String(id)
    setSourceSeasonIDs(prev => {
      const next = new Set(prev)
      if (next.has(sid)) next.delete(sid)
      else next.add(sid)
      return next
    })
    setResult(null); setGenError(null)
  }

  // ── Sync result ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!result) return
    setLocalTeams(result.teams ? { ...result.teams } : {})
    setLocalUnassigned(result.unassigned || [])
  }, [result])

  // ── Push to Dashboard ────────────────────────────────────────────────────
  const pushToDashboard = useCallback((teams) => {
    if (!onTeamsGenerated) return
    const ln = targetLeagueObj?.name   || 'Unknown League'
    const dn = targetDivisionObj?.name || '_unassigned'
    const seasonLabel = targetSeasonObj ? ` (${targetSeasonObj.name})` : ''
    onTeamsGenerated(teams, `${ln} — ${dn}${seasonLabel}`, ln, `${dn}${seasonLabel}`)
  }, [onTeamsGenerated, targetLeagueObj, targetDivisionObj, targetSeasonObj])

  // ── Preview (debounced 300 ms so cascade state changes don't all fire) ───
  const fetchPreview = useCallback(() => {
    if (!targetLeague) { setPreview(null); return }
    setPreviewLoading(true)
    clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(async () => {
      const p = new URLSearchParams({ team_size: teamSize })
      if (targetLeagueObj)   p.set('league_name', targetLeagueObj.name)
      if (targetDivisionObj) p.set('division_name', targetDivisionObj.name)
      if (sourceSeasonIDs.size > 0) p.set('season_ids', [...sourceSeasonIDs].join(','))
      try {
        const data = await fetch(`/api/player-count?${p}`).then(r => r.json())
        setPreview(data)
      } catch {
        setPreview(null)
      } finally {
        setPreviewLoading(false)
      }
    }, 300)
  }, [targetLeague, targetDivision, sourceSeasonIDs, teamSize, targetLeagueObj, targetDivisionObj]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPreview() }, [fetchPreview])

  // ── League change ────────────────────────────────────────────────────────
  const handleLeagueChange = (id) => {
    setTargetLeague(id)
    setTargetSeason('')
    setTargetDivision('')
    setSourceSeasonIDs(new Set())
    setResult(null); setGenError(null)
    setDismissed(new Set())
    setShowCreateSeason(false)
    setShowCreateLeague(false)
    setShowCreateDivision(false)
  }

  // ── New league created ────────────────────────────────────────────────────
  const handleCreateLeague = async () => {
    if (!newLeagueName.trim()) { setNewLeagueError('League name is required.'); return }
    setCreatingLeague(true); setNewLeagueError(null)
    try {
      const res  = await fetch('/api/league', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLeagueName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setNewLeagueError(data.error || 'Failed to create league.'); setCreatingLeague(false); return }
      setLeagues(prev => {
        const next = [...prev, data.league]
        if (_leagueDataCache) _leagueDataCache = { ..._leagueDataCache, leagues: next }
        return next
      })
      handleLeagueChange(String(data.league.id))
      setNewLeagueName('')
      setShowCreateLeague(false)
    } catch { setNewLeagueError('Could not connect to server.') }
    setCreatingLeague(false)
  }

  // ── New season created ────────────────────────────────────────────────────
  const handleSeasonCreated = (season) => {
    setSeasons(prev => {
      const next = [...prev, season]
      if (_leagueDataCache) _leagueDataCache = { ..._leagueDataCache, seasons: next }
      return next
    })
    setTargetSeason(String(season.id))
    setShowCreateSeason(false)
    setResult(null)
  }

  // ── New division created ──────────────────────────────────────────────
  const handleCreateDivision = async () => {
    if (!newDivisionName.trim()) { setNewDivisionError('Division name is required.'); return }
    if (!targetLeagueObj) { setNewDivisionError('Select a league first.'); return }
    setCreatingDivision(true); setNewDivisionError(null)
    try {
      const res  = await fetch('/api/division', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDivisionName.trim(), leagueID: targetLeagueObj.id }),
      })
      const data = await res.json()
      if (!res.ok) { setNewDivisionError(data.error || 'Failed to create division.'); setCreatingDivision(false); return }
      setDivisions(prev => {
        const next = [...prev, data.division]
        if (_leagueDataCache) _leagueDataCache = { ..._leagueDataCache, divisions: next }
        return next
      })
      setTargetDivision(String(data.division.id))
      setNewDivisionName('')
      setShowCreateDivision(false)
      setResult(null)
    } catch { setNewDivisionError('Could not connect to server.') }
    setCreatingDivision(false)
  }

  // ── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true); setGenError(null); setResult(null)
    try {
      const res = await fetch('/api/generate-teams/from-db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_size:     true,
          team_size:     teamSize,
          season_ids:    sourceSeasonIDs.size > 0 ? [...sourceSeasonIDs] : [],
          division_name: targetDivisionObj?.name || null,
          league_name:   targetLeagueObj?.name   || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setGenError(data.error || 'Something went wrong.'); setGenerating(false); return }
      setResult(data)
      pushToDashboard(data.teams)
    } catch { setGenError('Could not connect to server.') }
    setGenerating(false)
  }

  // ── Auto-assign all unassigned players randomly across teams ─────────────
  const handleAutoAssign = () => {
    if (localUnassigned.length === 0) return
    const teamKeys = Object.keys(localTeams)
    if (teamKeys.length === 0) return
    setLocalTeams(prev => {
      const next = { ...prev }
      const shuffled = [...localUnassigned].sort(() => Math.random() - 0.5)
      shuffled.forEach((player, i) => {
        const key = teamKeys[i % teamKeys.length]
        next[key] = recalcTeam({ ...next[key], players: [...next[key].players, player] })
      })
      pushToDashboard(next)
      return next
    })
    setLocalUnassigned([])
  }

  // ── Add unassigned to team ────────────────────────────────────────────────
  const handleAddToTeam = (player, teamKey) => {
    setLocalTeams(prev => {
      const next = { ...prev, [teamKey]: recalcTeam({ ...prev[teamKey], players: [...prev[teamKey].players, player] }) }
      pushToDashboard(next)
      return next
    })
    setLocalUnassigned(prev => prev.filter(p => p.playerID !== player.playerID))
  }

  // ── Data quality ─────────────────────────────────────────────────────────
  const handleDismiss = (key) => setDismissed(prev => new Set([...prev, key]))

  const handleSaveEdit = (playerID, form) => {
    const player = editingPlayer
    const fieldMap = { goals: 'Goals', assists: 'Assists', gamesPlayed: 'GamesPlayed', gaa: 'GAA', position: 'Position' }
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    for (const [key, label] of Object.entries(fieldMap)) {
      const oldVal = player[key]
      const newVal = form[key] === '' ? null : form[key]
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        setChangeLog(prev => [...prev, { time: now, name: player.name, field: label, oldValue: oldVal, newValue: newVal }])
      }
    }
    setDismissed(prev => {
      const s = new Set(prev)
      for (const t of ['no_stats','missing_gaa','missing_position','low_sample','anomalous_stats']) s.add(playerID + t)
      return s
    })
    setEditingPlayer(null)
    fetchPreview()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (refLoading) return (
    <div className="w-full max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Generate Teams</h1>
      <p className="text-gray-400">Loading league data…</p>
    </div>
  )
  if (refError) return (
    <div className="w-full max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Generate Teams</h1>
      <div className="bg-red-800/40 border border-red-700 text-red-300 rounded-lg p-4">{refError}</div>
    </div>
  )

  const teamEntries   = Object.entries(localTeams)
  const teamOptions   = teamEntries.map(([k, t], i) => [k, `Team ${i + 1}`, t.players.length])
  const hasUnassigned = localUnassigned.length > 0

  return (
    <div className="w-full max-w-6xl">
      <h1 className="text-2xl font-bold mb-1">Generate Teams</h1>
      <p className="text-gray-400 text-sm mb-6">
        Build balanced teams for a new season using historical player data.
      </p>

      {/* ── Step 1: Setup ────────────────────────────────────────────────── */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">Step 1 — Setup</p>

        <div className="flex flex-col gap-6 max-w-xl">

          {/* ── 1a: League ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm font-semibold">
              Which league are you creating teams for?
            </label>
            <div className="flex gap-2">
              <select value={targetLeague} onChange={e => handleLeagueChange(e.target.value)}
                className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white min-w-0">
                <option value="" disabled>Select a league…</option>
                {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button onClick={() => { setShowCreateLeague(s => !s); setNewLeagueName(''); setNewLeagueError(null) }}
                className={`px-3 rounded border text-sm transition shrink-0 ${showCreateLeague ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:text-white hover:border-gray-400'}`}>
                + New League
              </button>
            </div>
            {showCreateLeague && (
              <div className="p-3 bg-gray-700/60 border border-blue-700/50 rounded-lg flex flex-col gap-2">
                {newLeagueError && <p className="text-red-400 text-xs">{newLeagueError}</p>}
                <div className="flex gap-2">
                  <input value={newLeagueName} autoFocus
                    onChange={e => { setNewLeagueName(e.target.value); setNewLeagueError(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleCreateLeague()}
                    placeholder="e.g. Spring Adult League"
                    className="flex-1 bg-gray-800 border border-gray-600 focus:border-blue-400 text-white rounded px-3 py-1.5 text-sm focus:outline-none transition min-w-0" />
                  <button onClick={handleCreateLeague} disabled={creatingLeague}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded transition shrink-0">
                    {creatingLeague ? 'Creating…' : 'Create'}
                  </button>
                  <button onClick={() => setShowCreateLeague(false)}
                    className="text-gray-400 hover:text-white text-sm px-2 transition">✕</button>
                </div>
              </div>
            )}
          </div>

          {/* ── 1b: Season (only after league selected) ───────────────────── */}
          {targetLeagueObj && (
            <div className="flex flex-col gap-2">
              <label className="text-gray-300 text-sm font-semibold">
                What season are you creating teams for?
                <span className="text-gray-500 font-normal ml-1">(within {targetLeagueObj.name})</span>
              </label>
              {!showCreateSeason ? (
                <div className="flex gap-2">
                  <select value={targetSeason}
                    onChange={e => { setTargetSeason(e.target.value); setResult(null) }}
                    className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white min-w-0">
                    <option value="">No season label</option>
                    {leagueSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={() => setShowCreateSeason(true)}
                    className="px-3 rounded border border-gray-600 bg-gray-700 text-gray-300 hover:text-white hover:border-gray-400 text-sm transition shrink-0">
                    + New Season
                  </button>
                </div>
              ) : (
                <CreateSeasonForm
                  leagueObj={targetLeagueObj}
                  latestSeasonName={leagueSeasons[0]?.name || null}
                  onCreated={handleSeasonCreated}
                  onCancel={() => setShowCreateSeason(false)}
                />
              )}
              {targetSeasonObj && !showCreateSeason && (
                <p className="text-green-400 text-xs">✓ Teams will be labelled under <strong>{targetSeasonObj.name}</strong></p>
              )}
            </div>
          )}

          {/* ── 1c: Source seasons ────────────────────────────────────────── */}
          {targetLeagueObj && !showCreateSeason && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-sm font-semibold">
                  Which seasons should player stats come from?
                </label>
                {sourceSeasonOptions.length > 0 && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setSourceSeasonIDs(new Set(sourceSeasonOptions.map(s => String(s.id)))); setResult(null) }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition">All</button>
                    <span className="text-gray-600">·</span>
                    <button onClick={() => { setSourceSeasonIDs(new Set()); setResult(null) }}
                      className="text-xs text-gray-400 hover:text-gray-300 transition">None</button>
                  </div>
                )}
              </div>

              {sourceSeasonOptions.length === 0 ? (
                <p className="text-gray-500 text-sm">No seasons found — create a season first.</p>
              ) : (
                <>
                  <p className="text-gray-500 text-xs">
                    You can include the target season itself if it already has player data. Multi-season selections average stats per player and give returning players a small experience boost.
                  </p>

                  {/* ── Same-league seasons ── */}
                  {sameLeagueSrcSeasons.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide px-1">
                        {targetLeagueObj.name}
                      </p>
                      {sameLeagueSrcSeasons.map(s => {
                        const checked = sourceSeasonIDs.has(String(s.id))
                        const isTarget = String(s.id) === String(targetSeason)
                        return (
                          <label key={s.id}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ${checked ? 'bg-blue-900/30 border-blue-600' : 'bg-gray-700/40 border-gray-600 hover:border-gray-500'}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleSourceSeason(s.id)}
                              className="accent-blue-500 w-4 h-4 shrink-0" />
                            <span className={`text-sm flex-1 ${checked ? 'text-white' : 'text-gray-300'}`}>
                              {s.name}
                            </span>
                            {isTarget && (
                              <span className="text-xs bg-blue-700/60 text-blue-200 px-1.5 py-0.5 rounded shrink-0">target</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {/* ── Other leagues, grouped ── */}
                  {otherLeagueSrcSeasons.length > 0 && (() => {
                    const grouped = {}
                    otherLeagueSrcSeasons.forEach(s => {
                      if (!grouped[s.leagueID]) grouped[s.leagueID] = []
                      grouped[s.leagueID].push(s)
                    })
                    return (
                      <div className="flex flex-col gap-3 mt-1">
                        {Object.entries(grouped).map(([lgID, lgSeasons]) => {
                          const lg = leagues.find(l => String(l.id) === String(lgID))
                          return (
                            <div key={lgID} className="flex flex-col gap-1">
                              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide px-1">
                                {lg?.name ?? 'Other League'}
                              </p>
                              {lgSeasons.map(s => {
                                const checked = sourceSeasonIDs.has(String(s.id))
                                return (
                                  <label key={s.id}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ${checked ? 'bg-blue-900/30 border-blue-600' : 'bg-gray-700/40 border-gray-600 hover:border-gray-500'}`}>
                                    <input type="checkbox" checked={checked} onChange={() => toggleSourceSeason(s.id)}
                                      className="accent-blue-500 w-4 h-4 shrink-0" />
                                    <span className={`text-sm ${checked ? 'text-white' : 'text-gray-300'}`}>{s.name}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {sourceSeasonIDs.size > 1 && (
                    <p className="text-blue-300 text-xs mt-1">✓ Averaging stats across {sourceSeasonIDs.size} seasons. Returning players get up to +{Math.round(0.05 * (sourceSeasonIDs.size - 1) * 100)}% experience boost.</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── 1d: Division + Team size + Preview ───────────────────────── */}
          {targetLeagueObj && !showCreateSeason && (
            <div className="flex flex-col gap-4 pt-2 border-t border-gray-700">
              <div className="flex gap-4 flex-wrap">
                <div className="flex flex-col gap-1 flex-1 min-w-40">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
                    Division <span className="text-gray-600 font-normal">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <select value={targetDivision}
                      onChange={e => { setTargetDivision(e.target.value); setResult(null); setGenError(null); setShowCreateDivision(false) }}
                      className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white min-w-0">
                      <option value="">Assign on Dashboard later</option>
                      {leagueDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <button
                      onClick={() => { setShowCreateDivision(s => !s); setNewDivisionName(''); setNewDivisionError(null) }}
                      className={`px-3 rounded border text-sm transition shrink-0 ${showCreateDivision ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:text-white hover:border-gray-400'}`}>
                      + New
                    </button>
                  </div>
                  {showCreateDivision && (
                    <div className="p-3 bg-gray-700/60 border border-green-700/50 rounded-lg flex flex-col gap-2 mt-1">
                      {newDivisionError && <p className="text-red-400 text-xs">{newDivisionError}</p>}
                      <div className="flex gap-2">
                        <input value={newDivisionName} autoFocus
                          onChange={e => { setNewDivisionName(e.target.value); setNewDivisionError(null) }}
                          onKeyDown={e => e.key === 'Enter' && handleCreateDivision()}
                          placeholder="e.g. Beginner, Division 1…"
                          className="flex-1 bg-gray-800 border border-gray-600 focus:border-green-400 text-white rounded px-3 py-1.5 text-sm focus:outline-none transition min-w-0" />
                        <button onClick={handleCreateDivision} disabled={creatingDivision}
                          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded transition shrink-0">
                          {creatingDivision ? 'Creating…' : 'Create'}
                        </button>
                        <button onClick={() => setShowCreateDivision(false)}
                          className="text-gray-400 hover:text-white text-sm px-2 transition">✕</button>
                      </div>
                    </div>
                  )}
                  {targetDivisionObj && !showCreateDivision && (
                    <p className="text-green-400 text-xs">✓ Teams will be assigned to <strong>{targetDivisionObj.name}</strong></p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Players / Team</label>
                  <input type="number" min={2} max={20} value={teamSize}
                    onChange={e => { setTeamSize(parseInt(e.target.value) || 6); setResult(null) }}
                    className="p-2 rounded bg-gray-700 border border-gray-600 text-white w-24" />
                </div>
              </div>

              <div className="p-3 bg-gray-700/60 rounded-lg text-sm flex items-center gap-3 flex-wrap">
                {previewLoading
                  ? <span className="text-gray-400">Checking player pool…</span>
                  : preview
                    ? <>
                        <span className="text-gray-300"><span className="text-white font-semibold">{preview.count}</span> players found</span>
                        <span className="text-gray-500">→</span>
                        {preview.numTeams >= 2
                          ? <>
                              <span className="text-green-400 font-semibold">{preview.numTeams} teams</span>
                              <span className="text-gray-300">of {teamSize}</span>
                              {preview.remainder > 0 && <span className="text-yellow-400 text-xs">· {preview.remainder} unassigned</span>}
                            </>
                          : <span className="text-red-400">Not enough for 2 teams of {teamSize}</span>}
                      </>
                    : <span className="text-gray-500">Select a league and source seasons above.</span>}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Step 2: Data Quality ─────────────────────────────────────────── */}
      {targetLeagueObj && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Step 2 — Check Data Quality</p>
          <DataQualityPanel
            leagueObj={targetLeagueObj}
            divisionObj={targetDivisionObj}
            seasonID={sourceSeasonIDs.size === 1 ? [...sourceSeasonIDs][0] : null}
            dismissed={dismissed}
            onDismiss={handleDismiss}
            onEdit={setEditingPlayer}
            changeLog={changeLog}
          />
        </>
      )}

      {/* ── Step 3: Generate ─────────────────────────────────────────────── */}
      {targetLeagueObj && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Step 3 — Generate</p>
          {genError && (
            <div className="mb-4 p-4 bg-red-800/40 border border-red-700 text-red-300 rounded-lg text-sm">{genError}</div>
          )}
          {result ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-green-400 text-sm">✓ {teamEntries.length} teams generated and synced to Dashboard</span>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium px-5 py-2 rounded transition"
              >
                {generating ? 'Regenerating…' : '↺ Regenerate'}
              </button>
              <button
                onClick={() => { setResult(null); setLocalTeams({}); setLocalUnassigned([]); setGenError(null) }}
                className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-5 py-2 rounded transition"
              >
                Generate for Another Division
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={generating || !targetLeague || (preview?.numTeams ?? 0) < 2}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-8 py-2.5 rounded transition"
              >
                {generating ? 'Generating…' : `Generate Teams${targetSeasonObj ? ` for ${targetSeasonObj.name}` : ''}`}
              </button>
              {(preview?.numTeams ?? 0) < 2 && targetLeague && !previewLoading && (
                <p className="text-gray-500 text-sm">Select source seasons with enough players first.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold">{teamEntries.length} Teams Generated</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                {result.league && <><span className="text-white">{result.league}</span>{result.division ? ` — ${result.division}` : ''} · </>}
                {result.players_assigned} assigned · {result.goalies_assigned} goalie{result.goalies_assigned !== 1 ? 's' : ''}
                {hasUnassigned && <span className="text-yellow-400 ml-2">· {localUnassigned.length} unassigned</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {teamEntries.map(([key, team], i) => (
              <TeamCard key={key} label={`Team ${i + 1}`} team={team} />
            ))}
          </div>

          {hasUnassigned && (
            <UnassignedSection
              players={localUnassigned}
              teamOptions={teamOptions}
              onAddToTeam={handleAddToTeam}
              onAutoAssign={handleAutoAssign}
            />
          )}

          <ChangeLog entries={changeLog} />
        </>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onSave={handleSaveEdit}
          onClose={() => setEditingPlayer(null)}
        />
      )}
    </div>
  )
}
