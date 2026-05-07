// Schedule Manager — admin tool for generating and publishing game schedules.
//
// Workflow:
//   1. Admin picks a league, division, and season from the FilterBar dropdowns.
//   2. Clicks "Generate Schedule" — sends committed teams to the backend which
//      runs the round-robin scheduling algorithm and returns draft games.
//   3. Admin previews the games in the FullCalendar daygrid and a table below.
//   4. Clicks "Publish" to write the games to the Schedule table, making them
//      visible on the public calendar. Publishing also clears the client-side
//      schedule cache (localStorage) so the public pages fetch fresh data.
//
// inferNextSeasonName is shared with GenerateTeams.jsx — both need to suggest a
// sensible season name in their "Save / Create season" dialogs.
import { useState, useEffect, useCallback, useMemo } from 'react'
import { clearScheduleCache } from '../api/fetchApiData'
import { getAuthToken, AUTH_HEADER_KEY } from '../context/Authentication'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

// ─── Calendar CSS (dark theme) ────────────────────────────────────────────────
const CALENDAR_CSS = `
  .fc { font-family: system-ui,sans-serif; }
  .fc-toolbar-title { color: #fff !important; font-size: 16px !important; }
  .fc-button { background: rgba(255,255,255,0.12) !important; border: 1px solid rgba(255,255,255,0.2) !important; color: #fff !important; border-radius: 6px !important; }
  .fc-button:hover { background: rgba(255,255,255,0.22) !important; }
  .fc-col-header-cell-cushion { color: #fff !important; font-size: 13px; }
  .fc-col-header-cell { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.08) !important; }
  .fc-daygrid-day { background: #111827 !important; border-color: rgba(255,255,255,0.08) !important; }
  .fc-daygrid-day:hover { background: #1f2937 !important; }
  .fc-daygrid-day-number { color: rgba(255,255,255,0.6) !important; font-size: 12px; }
  .fc-day-other .fc-daygrid-day-number { color: rgba(255,255,255,0.2) !important; }
  .fc-event { border-radius: 4px !important; padding: 2px 5px !important; font-size: 10px !important; cursor: pointer !important; border: none !important; }
  .fc-event:hover { opacity: 0.85; }
  .fc-scrollgrid, .fc-scrollgrid td, .fc-scrollgrid th { border-color: rgba(255,255,255,0.08) !important; }
  .fc-today-button { display: none !important; }
  .fc-daygrid-day.fc-day-today { background: #1e3a5f !important; }
  .fc-more-link { color: rgba(255,255,255,0.55) !important; font-size: 10px; }
`

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function inferNextSeasonName(lastSeasonName, leagueName) {
  if (!lastSeasonName) return `Regular Season - ${leagueName} ${new Date().getFullYear() + 1}`
  const rangeMatch = lastSeasonName.match(/(\d{4})-(\d{4})/)
  if (rangeMatch) {
    const y1 = parseInt(rangeMatch[1]), y2 = parseInt(rangeMatch[2])
    return lastSeasonName.replace(`${y1}-${y2}`, `${y1 + 1}-${y2 + 1}`)
  }
  const singleMatch = lastSeasonName.match(/\b(\d{4})\b/)
  if (singleMatch) {
    const y = parseInt(singleMatch[1])
    return lastSeasonName.replace(String(y), String(y + 1))
  }
  return `${lastSeasonName} (Next)`
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
// Cascading selects: picking a league narrows the division and season dropdowns
// to only show items that belong to that league.

function FilterBar({ leagues, divisions, seasons, filters, onChange }) {
  const leagueDiv  = divisions.filter(d => !filters.leagueID || d.leagueID === Number(filters.leagueID))
  const seasonList = seasons.filter(s => !filters.leagueID || s.leagueID === Number(filters.leagueID))
  return (
    <div className="flex flex-wrap gap-3 mb-5">
      <select value={filters.leagueID || ''} onChange={e => onChange({ leagueID: e.target.value || null, divisionID: null, seasonID: null })}
        className="p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm">
        <option value="">All Leagues</option>
        {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      {filters.leagueID && leagueDiv.length > 0 && (
        <select value={filters.divisionID || ''} onChange={e => onChange({ ...filters, divisionID: e.target.value || null, seasonID: null })}
          className="p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm">
          <option value="">All Divisions</option>
          {leagueDiv.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
      {filters.leagueID && seasonList.length > 0 && (
        <select value={filters.seasonID || ''} onChange={e => onChange({ ...filters, seasonID: e.target.value || null })}
          className="p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm">
          <option value="">All Seasons</option>
          {seasonList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel, busy = false }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm border border-gray-600 shadow-2xl">
        <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
        {message && <p className="text-gray-400 text-sm mb-5">{message}</p>}
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={busy}
            className={`flex-1 py-2 rounded-lg font-medium text-white transition disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {busy ? 'Deleting…' : confirmLabel}
          </button>
          {onCancel && (
            <button onClick={onCancel} disabled={busy}
              className="flex-1 py-2 rounded-lg font-medium bg-gray-600 hover:bg-gray-500 text-white transition">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Schedule preset utilities ────────────────────────────────────────────────
function newPresetId() { return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }
function presetSummary(p) {
  const days  = (p.gameDays || []).map(d => DAYS[d]).join(', ') || 'No days'
  const times = (p.gameTimes || []).join(', ') || '—'
  const dates = p.startDate ? (p.endDate ? `${fmt(p.startDate)} → ${fmt(p.endDate)}` : `From ${fmt(p.startDate)}`) : ''
  return [dates, `${days} · ${times} · ${p.rounds || 1}× · max ${p.maxGamesPerDay || 1}/day${p.rink ? ` · ${p.rink}` : ''}`].filter(Boolean).join(' · ')
}

// ─── Preset Edit Form ─────────────────────────────────────────────────────────

function PresetEditForm({ initial, onSave, onCancel }) {
  const isNew = !initial
  const [name,           setName]           = useState(initial?.name || '')
  const [startDate,      setStartDate]      = useState(initial?.startDate || '')
  const [endDate,        setEndDate]        = useState(initial?.endDate || '')
  const [gameDays,       setGameDays]       = useState(initial?.gameDays || [6])
  const [gameTimes,      setGameTimes]      = useState(initial?.gameTimes?.length ? initial.gameTimes : ['19:00'])
  const [rounds,         setRounds]         = useState(initial?.rounds || 1)
  const [maxGamesPerDay, setMaxGamesPerDay] = useState(initial?.maxGamesPerDay || 1)
  const [rink,           setRink]           = useState(initial?.rink || '')
  const [error,          setError]          = useState(null)

  const toggleDay  = d  => setGameDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  const setTime    = (i, val) => setGameTimes(prev => prev.map((t, idx) => idx === i ? val : t))
  const addTime    = ()  => setGameTimes(prev => [...prev, '19:00'])
  const removeTime = (i) => setGameTimes(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required.'); return }
    if (gameDays.length === 0) { setError('Select at least one game day.'); return }
    const times = gameTimes.filter(Boolean)
    if (!times.length) { setError('At least one game time is required.'); return }
    onSave({ ...(initial || {}), id: initial?.id || newPresetId(), name: name.trim(), startDate: startDate || null, endDate: endDate || null, gameDays, gameTimes: times, rounds, maxGamesPerDay, rink })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-sm">{isNew ? 'New Preset' : 'Edit Preset'}</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
      </div>
      {error && <p className="text-red-400 text-xs mb-3 bg-red-900/20 border border-red-700/40 rounded p-2">{error}</p>}
      <div className="space-y-4">
        <div>
          <label className="text-gray-400 text-xs block mb-1">Preset Name <span className="text-red-400">*</span></label>
          <input value={name} autoFocus onChange={e => { setName(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Saturday Mornings"
            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-blue-400 text-white text-sm focus:outline-none transition" />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Dates <span className="text-gray-500">(optional)</span></label>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-gray-500 text-xs block mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-gray-500 text-xs block mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || undefined}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-2">Game Days</label>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  gameDays.includes(i)
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-400'
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-2">Game Times</label>
          <div className="space-y-2">
            {gameTimes.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-gray-500 text-xs w-12">Slot {i + 1}</span>
                <input type="time" value={t} onChange={e => setTime(i, e.target.value)}
                  className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
                {gameTimes.length > 1 && (
                  <button onClick={() => removeTime(i)} className="text-gray-500 hover:text-red-400 text-sm px-1 transition">✕</button>
                )}
              </div>
            ))}
            <button onClick={addTime} className="text-xs text-blue-400 hover:text-blue-300 transition">+ Add time slot</button>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-gray-400 text-xs block mb-1">Rounds per pair</label>
            <input type="number" min={1} max={8} value={rounds}
              onChange={e => setRounds(Math.max(1, Number(e.target.value)))}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-gray-400 text-xs block mb-1">Max games per day</label>
            <input type="number" min={1} max={20} value={maxGamesPerDay}
              onChange={e => setMaxGamesPerDay(Math.max(1, Number(e.target.value)))}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
          </div>
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Default Rink / Location <span className="text-gray-500">(optional)</span></label>
          <input type="text" value={rink} onChange={e => setRink(e.target.value)}
            placeholder="e.g. Dobson Ice Arena"
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={handleSave}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition text-sm">
          {isNew ? 'Create Preset' : 'Update Preset'}
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg transition text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Generate Schedule Modal ──────────────────────────────────────────────────

function estimateEndDate(startDate, gameDays, totalGames, maxGamesPerDay, blackoutDates) {
  if (!startDate || gameDays.length === 0 || totalGames === 0) return null
  const blackoutSet = new Set(blackoutDates)
  const sorted  = [...gameDays].sort((a, b) => a - b)
  let   count   = 0
  const cursor  = new Date(startDate + 'T12:00:00')
  const safeMax = new Date(startDate + 'T12:00:00')
  safeMax.setFullYear(safeMax.getFullYear() + 5)
  let lastDate  = null
  while (count < totalGames && cursor <= safeMax) {
    const ds = cursor.toISOString().split('T')[0]
    if (sorted.includes(cursor.getDay()) && !blackoutSet.has(ds)) {
      lastDate = ds
      count   += maxGamesPerDay
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return lastDate
}

// Builds the full round-robin matchup list and assigns each game to a date/time slot
// entirely in the browser. Returns an array of game objects immediately (no server call).
// The server call still runs to persist to the DB, but the user sees the result right away.
function generateSchedule(teams, { startDate, endDate, gameDays, gameTimes, rounds, maxGamesPerDay, blackoutDates }) {
  const matchups = []
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const flip = r % 2 !== 0
        matchups.push({
          homeID:       flip ? teams[j].ScheduledTeamID : teams[i].ScheduledTeamID,
          awayID:       flip ? teams[i].ScheduledTeamID : teams[j].ScheduledTeamID,
          homeTeamName: flip ? teams[j].TeamName        : teams[i].TeamName,
          awayTeamName: flip ? teams[i].TeamName        : teams[j].TeamName,
        })
      }
    }
  }

  const blackoutSet  = new Set(blackoutDates)
  const sortedDays   = [...gameDays].sort((a, b) => a - b)
  const validTimes   = gameTimes.filter(Boolean)
  const cursor       = new Date(startDate + 'T12:00:00')
  const endCursor    = endDate ? new Date(endDate + 'T12:00:00') : null
  const safeMax      = new Date(startDate + 'T12:00:00')
  safeMax.setFullYear(safeMax.getFullYear() + 5)

  const games = []
  let mi = 0
  while (mi < matchups.length && cursor <= safeMax) {
    if (endCursor && cursor > endCursor) break
    const ds = cursor.toISOString().split('T')[0]
    if (sortedDays.includes(cursor.getDay()) && !blackoutSet.has(ds)) {
      for (let g = 0; g < maxGamesPerDay && mi < matchups.length; g++, mi++) {
        games.push({ ...matchups[mi], date: ds, time: validTimes[g % validTimes.length] })
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return games
}

function GenerateModal({ teams, seasonID, onClose, onDone }) {
  const [modalTab,       setModalTab]       = useState('configure')
  const [presets,        setPresets]        = useState([])
  const [presetsLoading, setPresetsLoading] = useState(true)
  const [editingPreset,  setEditingPreset]  = useState(null)   // null | 'new' | preset obj
  const [showSaveAs,     setShowSaveAs]     = useState(false)
  const [saveAsName,     setSaveAsName]     = useState('')
  const [appliedPreset,  setAppliedPreset]  = useState(null)

  const [startDate,      setStartDate]      = useState('')
  const [endDate,        setEndDate]        = useState('')
  const [gameDays,       setGameDays]       = useState([6])
  const [gameTimes,      setGameTimes]      = useState(['19:00'])
  const [rink,           setRink]           = useState('')
  const [previewGames,   setPreviewGames]   = useState([])   // client-generated preview
  const [saveStatus,     setSaveStatus]     = useState(null) // null | 'saving' | 'saved' | 'error'
  const [rounds,         setRounds]         = useState(1)
  const [maxGamesPerDay, setMaxGamesPerDay] = useState(1)
  const [blackoutDates,  setBlackoutDates]  = useState([])
  const [blackoutInput,  setBlackoutInput]  = useState('')
  const [error,          setError]          = useState(null)

  const toggleDay  = d  => setGameDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  const setTime    = (i, val) => setGameTimes(prev => prev.map((t, idx) => idx === i ? val : t))
  const addTime    = ()  => setGameTimes(prev => [...prev, '19:00'])
  const removeTime = (i) => setGameTimes(prev => prev.filter((_, idx) => idx !== i))

  const totalGames = Math.floor(teams.length * (teams.length - 1) / 2) * rounds
  const estEndDate = estimateEndDate(startDate, gameDays, totalGames, maxGamesPerDay, blackoutDates)

  const addBlackout    = () => {
    if (!blackoutInput) return
    if (!blackoutDates.includes(blackoutInput)) setBlackoutDates(prev => [...prev, blackoutInput].sort())
    setBlackoutInput('')
  }
  const removeBlackout = (d) => setBlackoutDates(prev => prev.filter(x => x !== d))

  // ── Preset actions ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/presets')
      .then(r => r.json())
      .then(data => { setPresets(Array.isArray(data) ? data : []); setPresetsLoading(false) })
      .catch(() => setPresetsLoading(false))
  }, [])

  const applyPreset = (p) => {
    if (p.startDate) setStartDate(p.startDate)
    if (p.endDate)   setEndDate(p.endDate)
    setGameDays(p.gameDays || [6])
    setGameTimes(p.gameTimes?.length ? p.gameTimes : ['19:00'])
    setRounds(p.rounds || 1)
    setMaxGamesPerDay(p.maxGamesPerDay || 1)
    setRink(p.rink || '')
    setAppliedPreset(p)
    setModalTab('configure')
  }

  const deletePreset = async (id) => {
    await fetch(`/api/presets/${id}`, { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } })
    setPresets(prev => prev.filter(p => p.id !== id))
  }

  const saveCurrentAsPreset = async () => {
    if (!saveAsName.trim()) return
    const body = {
      name: saveAsName.trim(),
      startDate: startDate || null, endDate: endDate || null,
      gameDays, gameTimes: gameTimes.filter(Boolean), rounds, maxGamesPerDay, rink,
    }
    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const { id } = await res.json()
      setPresets(prev => [...prev, { ...body, id }])
      setSaveAsName('')
      setShowSaveAs(false)
    }
  }

  const handlePresetSave = async (preset) => {
    if (editingPreset === 'new') {
      const { id: _tmp, ...body } = preset
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const { id } = await res.json()
        setPresets(prev => [...prev, { ...body, id }])
      }
    } else {
      await fetch(`/api/presets/${preset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
        body: JSON.stringify(preset),
      })
      setPresets(prev => prev.map(p => p.id === preset.id ? preset : p))
      if (appliedPreset?.id === preset.id) setAppliedPreset(preset)
    }
    setEditingPreset(null)
  }

  const handleSubmit = async () => {
    if (!startDate) { setError('Start date is required.'); return }
    if (gameDays.length === 0) { setError('Select at least one game day.'); return }
    const validTimes = gameTimes.filter(Boolean)
    if (validTimes.length === 0) { setError('At least one game time is required.'); return }
    setError(null)

    // Step 1: generate the schedule in JS instantly so the user sees results right away
    const preview = generateSchedule(teams, {
      startDate, endDate, gameDays, gameTimes: validTimes,
      rounds, maxGamesPerDay, blackoutDates,
    })
    setPreviewGames(preview)
    setModalTab('preview')
    setSaveStatus('saving')

    // Step 2: persist to DB in background — server does the authoritative insert
    try {
      const res = await fetch('/api/games/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
        body: JSON.stringify({
          teamIDs: teams.map(t => t.ScheduledTeamID),
          seasonID, startDate, endDate: endDate || null,
          gameDays, gameTimes: validTimes, rink,
          roundMultiplier: rounds, maxGamesPerDay, blackoutDates,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveStatus('error'); setError(data.error || 'Failed to save.'); return }
      setSaveStatus('saved')
      onDone(data.gamesCreated)
    } catch {
      setSaveStatus('error')
      setError('Network error — please try again.')
    }
  }

  const sectionLabel = (text) => (
    <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2 mt-4 border-t border-gray-700/60 pt-3">{text}</p>
  )

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl w-full max-w-lg border border-gray-600 max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* ── Header + Tab Bar ── */}
        <div className="px-6 pt-5 pb-0 border-b border-gray-700">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-white font-semibold text-lg">Generate Schedule</h2>
              <p className="text-gray-400 text-sm mt-0.5">{teams.length} teams · {totalGames} total games</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none mt-0.5 ml-4">✕</button>
          </div>
          <div className="flex">
            {[
              { id: 'configure', label: 'Configure' },
              { id: 'presets',   label: presets.length ? `Presets (${presets.length})` : 'Presets' },
              ...(previewGames.length > 0 ? [{ id: 'preview', label: `Preview (${previewGames.length})` }] : []),
            ].map(t => (
              <button key={t.id} onClick={() => { setModalTab(t.id); setEditingPreset(null) }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                  modalTab === t.id
                    ? 'text-white border-red-500'
                    : 'text-gray-400 border-transparent hover:text-white hover:border-gray-500'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Presets Tab ── */}
        {modalTab === 'presets' && (
          <div className="px-6 py-5">
            {editingPreset !== null ? (
              <PresetEditForm
                initial={editingPreset === 'new' ? null : editingPreset}
                onSave={handlePresetSave}
                onCancel={() => setEditingPreset(null)}
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400 text-sm">
                    {presets.length === 0 ? 'No presets saved yet.' : `${presets.length} preset${presets.length !== 1 ? 's' : ''}`}
                  </p>
                  <button onClick={() => setEditingPreset('new')}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition font-medium">
                    + New Preset
                  </button>
                </div>

                {presetsLoading ? (
                  <div className="text-center py-10 text-gray-500 text-sm">Loading presets...</div>
                ) : presets.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-gray-600 rounded-xl">
                    <p className="text-gray-400 text-sm font-medium mb-1">No presets yet</p>
                    <p className="text-gray-600 text-xs mb-3">Configure your schedule settings and save them as a preset for quick reuse.</p>
                    <button onClick={() => setModalTab('configure')}
                      className="text-blue-400 hover:text-blue-300 text-xs transition underline">
                      Go to Configure →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {presets.map(p => (
                      <div key={p.id}
                        className={`rounded-xl p-4 border transition ${
                          appliedPreset?.id === p.id
                            ? 'bg-red-900/20 border-red-700/50'
                            : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                        }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-medium text-sm">{p.name}</p>
                              {appliedPreset?.id === p.id && (
                                <span className="text-red-400 text-xs bg-red-900/40 border border-red-700/40 px-1.5 py-0.5 rounded-full">applied</span>
                              )}
                            </div>
                            <p className="text-gray-400 text-xs mt-1">{presetSummary(p)}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => applyPreset(p)}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg transition font-medium">
                              Apply
                            </button>
                            <button onClick={() => setEditingPreset(p)}
                              className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-2.5 py-1.5 rounded-lg transition">
                              Edit
                            </button>
                            <button onClick={() => deletePreset(p.id)}
                              className="text-gray-500 hover:text-red-400 text-sm px-1.5 py-1 rounded-lg transition">
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Preview Tab — shown immediately after client-side generation ── */}
        {modalTab === 'preview' && (
          <div className="px-6 py-4">
            {/* Save status banner */}
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700/50 text-blue-300 text-xs rounded-lg px-3 py-2 mb-4">
                <svg className="animate-spin w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Saving {previewGames.length} games to database…
              </div>
            )}
            {saveStatus === 'error' && error && (
              <div className="bg-red-900/20 border border-red-700/50 text-red-400 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <p className="text-gray-400 text-xs mb-3">{previewGames.length} games generated · scroll to review</p>
            <div className="overflow-y-auto max-h-[420px] rounded-lg border border-gray-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-700/80 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-gray-400 font-medium">#</th>
                    <th className="px-3 py-2 text-gray-400 font-medium">Date</th>
                    <th className="px-3 py-2 text-gray-400 font-medium">Time</th>
                    <th className="px-3 py-2 text-gray-400 font-medium">Home</th>
                    <th className="px-3 py-2 text-gray-400 font-medium">Away</th>
                  </tr>
                </thead>
                <tbody>
                  {previewGames.map((g, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-800/60' : 'bg-gray-800/30'}>
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 text-white">{fmt(g.date)}</td>
                      <td className="px-3 py-2 text-white">{fmtTime(g.time)}</td>
                      <td className="px-3 py-2 text-white">{g.homeTeamName}</td>
                      <td className="px-3 py-2 text-white">{g.awayTeamName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Configure Tab ── */}
        {modalTab === 'configure' && (
          <div className="px-6 py-4 space-y-1">
            {appliedPreset && (
              <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2 mb-1 text-xs">
                <span className="text-red-400 font-medium">Preset applied:</span>
                <span className="text-red-300">{appliedPreset.name}</span>
                <button onClick={() => setAppliedPreset(null)} className="text-red-600 hover:text-red-400 ml-auto leading-none">✕</button>
              </div>
            )}
            {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-700/50 rounded p-2 mb-2">{error}</p>}

            {sectionLabel('Dates')}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-gray-400 text-xs block mb-1">Start Date <span className="text-red-400">*</span></label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-gray-400 text-xs block mb-1">Hard End Date <span className="text-gray-500">(optional)</span></label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
              </div>
            </div>

            {sectionLabel('Game Days')}
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    gameDays.includes(i)
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-400'
                  }`}>
                  {d}
                </button>
              ))}
            </div>

            {sectionLabel('Game Times')}
            <div className="space-y-2">
              {gameTimes.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs w-12">Slot {i + 1}</span>
                  <input type="time" value={t} onChange={e => setTime(i, e.target.value)}
                    className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
                  {gameTimes.length > 1 && (
                    <button onClick={() => removeTime(i)} className="text-gray-500 hover:text-red-400 text-sm transition px-1">✕</button>
                  )}
                </div>
              ))}
              <button onClick={addTime} className="text-xs text-blue-400 hover:text-blue-300 transition mt-1">+ Add another time slot</button>
            </div>

            {sectionLabel('Format')}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-gray-400 text-xs block mb-1">Rounds per pair</label>
                <input type="number" min={1} max={8} value={rounds} onChange={e => setRounds(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
                <p className="text-gray-600 text-xs mt-1">1 = each team plays every other team once</p>
              </div>
              <div className="flex-1">
                <label className="text-gray-400 text-xs block mb-1">Max games per game day</label>
                <input type="number" min={1} max={20} value={maxGamesPerDay} onChange={e => setMaxGamesPerDay(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
              </div>
            </div>

            {sectionLabel('Venue')}
            <div>
              <label className="text-gray-400 text-xs block mb-1">Rink / Location <span className="text-gray-500">(optional)</span></label>
              <input type="text" placeholder="e.g. Dobson Ice Arena" value={rink} onChange={e => setRink(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
            </div>

            {sectionLabel('Blackout Dates')}
            <p className="text-gray-500 text-xs mb-2">Specific dates to skip — holidays, tournaments, ice time conflicts, etc.</p>
            <div className="flex gap-2">
              <input type="date" value={blackoutInput} onChange={e => setBlackoutInput(e.target.value)} min={startDate || undefined}
                className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
              <button onClick={addBlackout} disabled={!blackoutInput}
                className="bg-gray-600 hover:bg-gray-500 disabled:opacity-40 text-white text-xs px-3 py-2 rounded transition">
                Add
              </button>
            </div>
            {blackoutDates.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {blackoutDates.map(d => (
                  <span key={d} className="flex items-center gap-1.5 bg-orange-900/40 border border-orange-700/50 text-orange-300 text-xs px-2 py-1 rounded-full">
                    {fmt(d)}
                    <button onClick={() => removeBlackout(d)} className="text-orange-400 hover:text-orange-200 leading-none">✕</button>
                  </span>
                ))}
              </div>
            )}

            {startDate && gameDays.length > 0 && (
              <div className="mt-4 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 space-y-1.5">
                <p className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2">Schedule Preview</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-400">Total games</span>
                  <span className="text-white font-medium">{totalGames}</span>
                  <span className="text-gray-400">Rounds</span>
                  <span className="text-white font-medium">{rounds}× round-robin</span>
                  <span className="text-gray-400">Game days</span>
                  <span className="text-white font-medium">{gameDays.map(d => DAYS[d]).join(', ')}</span>
                  <span className="text-gray-400">Games per day</span>
                  <span className="text-white font-medium">{maxGamesPerDay}</span>
                  {blackoutDates.length > 0 && (
                    <>
                      <span className="text-gray-400">Blackout dates</span>
                      <span className="text-orange-300 font-medium">{blackoutDates.length} skipped</span>
                    </>
                  )}
                  <span className="text-gray-400">Estimated end</span>
                  <span className="text-white font-medium">{estEndDate ? fmt(estEndDate) : '—'}</span>
                </div>
              </div>
            )}

            {/* ── Save as Preset ── */}
            <div className="mt-4 pt-4 border-t border-gray-700/60">
              {showSaveAs ? (
                <div className="p-3 bg-gray-700/40 border border-blue-700/40 rounded-lg">
                  <p className="text-gray-300 text-xs font-medium mb-2">Save current settings as a preset</p>
                  <div className="flex gap-2">
                    <input value={saveAsName} autoFocus
                      onChange={e => setSaveAsName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveCurrentAsPreset()}
                      placeholder="Preset name…"
                      className="flex-1 min-w-0 bg-gray-800 border border-gray-600 focus:border-blue-400 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none transition" />
                    <button onClick={saveCurrentAsPreset} disabled={!saveAsName.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs px-4 py-1.5 rounded-lg transition shrink-0 font-medium">
                      Save
                    </button>
                    <button onClick={() => { setShowSaveAs(false); setSaveAsName('') }}
                      className="text-gray-400 hover:text-white text-sm px-2 transition">✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowSaveAs(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400 text-xs transition group">
                  <span className="text-base leading-none">💾</span>
                  Save current settings as a preset
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        {modalTab === 'configure' && (
          <div className="px-6 pb-5 pt-2 flex gap-3 border-t border-gray-700/60 mt-2">
            <button onClick={handleSubmit} disabled={!startDate || gameDays.length === 0}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition">
              {`Generate ${totalGames} Games`}
            </button>
            <button onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2.5 rounded-lg transition">
              Cancel
            </button>
          </div>
        )}
        {modalTab === 'preview' && (
          <div className="px-6 pb-5 pt-2 flex gap-3 border-t border-gray-700/60 mt-2">
            <button onClick={() => { setModalTab('configure'); setSaveStatus(null); setPreviewGames([]) }}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2.5 rounded-lg font-medium transition">
              ← Back to Configure
            </button>
            <button onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2.5 rounded-lg transition">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Game Edit Modal ──────────────────────────────────────────────────────────

function GameModal({ game, prefillDate, allTeams, onClose, onSave }) {
  const [form, setForm] = useState({
    GameDate:         game?.GameDate        || prefillDate || '',
    GameTime:         game?.GameTime        || '',
    Rink:             game?.Rink            || '',
    HomeTeamID:       game?.HomeTeamID      || '',
    AwayTeamID:       game?.AwayTeamID      || '',
    HomeTeamScore:    game?.HomeTeamScore   ?? '',
    AwayTeamScore:    game?.AwayTeamScore   ?? '',
    CurrentGameStatus: game?.CurrentGameStatus || 'Draft',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    const isNew = !game
    const url   = isNew ? '/api/games' : `/api/games/${game.GameID}`
    const body  = {
      ...form,
      HomeTeamScore: form.HomeTeamScore === '' ? null : Number(form.HomeTeamScore),
      AwayTeamScore: form.AwayTeamScore === '' ? null : Number(form.AwayTeamScore),
      SeasonID: game?.SeasonID,
    }
    const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Save failed.'); return }
    onSave()
  }

  const divTeams = allTeams.filter(t => game ? t.DivisionID === game.DivisionID && t.SeasonID === game.SeasonID : true)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-600" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-semibold text-lg mb-4">{game ? 'Edit Game' : 'Add Game'}</h2>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-gray-400 text-xs block mb-1">Home Team</label>
              <select value={form.HomeTeamID} onChange={e => set('HomeTeamID', Number(e.target.value))}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm">
                <option value="">Select…</option>
                {divTeams.map(t => <option key={t.ScheduledTeamID} value={t.ScheduledTeamID}>{t.Name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-gray-400 text-xs block mb-1">Away Team</label>
              <select value={form.AwayTeamID} onChange={e => set('AwayTeamID', Number(e.target.value))}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm">
                <option value="">Select…</option>
                {divTeams.map(t => <option key={t.ScheduledTeamID} value={t.ScheduledTeamID}>{t.Name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-gray-400 text-xs block mb-1">Date</label>
              <input type="date" value={form.GameDate} onChange={e => set('GameDate', e.target.value)}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-gray-400 text-xs block mb-1">Time</label>
              <input type="time" value={form.GameTime} onChange={e => set('GameTime', e.target.value)}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Rink</label>
            <input type="text" value={form.Rink} onChange={e => set('Rink', e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-gray-400 text-xs block mb-1">Home Score</label>
              <input type="number" min={0} value={form.HomeTeamScore} onChange={e => set('HomeTeamScore', e.target.value)}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-gray-400 text-xs block mb-1">Away Score</label>
              <input type="number" min={0} value={form.AwayTeamScore} onChange={e => set('AwayTeamScore', e.target.value)}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Status</label>
            <select value={form.CurrentGameStatus} onChange={e => set('CurrentGameStatus', e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm">
              <option value="Draft">Draft</option>
              <option value="Scheduled">Published</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded font-medium transition">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded transition">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Game Detail Modal ────────────────────────────────────────────────────────

function GameDetailModal({ game, onClose, onEdit, onDelete }) {
  const [homePlayers, setHomePlayers] = useState([])
  const [awayPlayers, setAwayPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true)
      try {
        const [homeRes, awayRes] = await Promise.all([
          fetch(`/api/scheduled-teams/${game.HomeTeamID}/players`),
          fetch(`/api/scheduled-teams/${game.AwayTeamID}/players`),
        ])
        const [homeData, awayData] = await Promise.all([homeRes.json(), awayRes.json()])
        setHomePlayers(Array.isArray(homeData) ? homeData : [])
        setAwayPlayers(Array.isArray(awayData) ? awayData : [])
      } catch (_) { /* ignore */ }
      setLoading(false)
    }
    fetchPlayers()
  }, [game.HomeTeamID, game.AwayTeamID])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-600 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold text-lg leading-tight">
              {game.HomeTeamName} <span className="text-gray-400">vs</span> {game.AwayTeamName}
            </h2>
            <div className="mt-0.5 space-y-0.5">
              <p className="text-gray-400 text-sm">
                {fmt(game.GameDate)}{game.GameTime ? ` · ${fmtTime(game.GameTime)}` : ''}
              </p>
              {game.Rink && (
                <p className="text-green-400 text-sm font-medium">📍 {game.Rink}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition font-medium">Edit</button>
            {onDelete && (
              <button onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg transition font-medium">Delete</button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        {game.HomeTeamScore != null && (
          <div className="text-center mb-4 py-3 bg-gray-700/50 rounded-lg">
            <span className="text-white font-bold text-3xl tabular-nums">
              {game.HomeTeamScore} – {game.AwayTeamScore}
            </span>
            <p className="text-gray-500 text-xs mt-1">Final Score</p>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-6">Loading rosters…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Home', name: game.HomeTeamName, players: homePlayers },
              { label: 'Away', name: game.AwayTeamName, players: awayPlayers },
            ].map(({ label, name, players }) => (
              <div key={label}>
                <h3 className="text-white font-medium text-sm mb-2">
                  {name}<span className="text-gray-500 text-xs ml-1.5">({label})</span>
                </h3>
                {players.length === 0 ? (
                  <p className="text-gray-500 text-xs italic">No players on record</p>
                ) : (
                  <ul className="space-y-1.5">
                    {players.map(p => (
                      <li key={p.PlayerID} className="flex justify-between text-xs">
                        <span className="text-gray-300">{p.FirstName} {p.LastName}</span>
                        <span className="text-gray-500">{p.Position || '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-gray-700 flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            game.CurrentGameStatus === 'Scheduled' ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
          }`}>
            {game.CurrentGameStatus === 'Scheduled' ? 'Published' : 'Draft'}
          </span>
          {game.DivisionName && <span className="text-gray-500 text-xs">{game.DivisionName}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Team Edit Modal ──────────────────────────────────────────────────────────

function TeamEditModal({ team, onClose, onSaved }) {
  const [name,    setName]    = useState(team.Name)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    fetch(`/api/scheduled-teams/${team.ScheduledTeamID}/players`)
      .then(r => r.json())
      .then(data => { setPlayers(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [team.ScheduledTeamID])

  const handleSave = async () => {
    if (!name.trim()) { setError('Team name cannot be empty.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/scheduled-teams/${team.ScheduledTeamID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
        body: JSON.stringify({ name: name.trim() }),
      })
      let data
      try { data = await res.json() }
      catch { setError('Server is not responding.'); setSaving(false); return }
      if (!res.ok) { setError(data.error || 'Save failed.'); setSaving(false); return }
      setSaved(true)
      onSaved()
    } catch { setError('Could not connect to server.') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-600 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Edit Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="text-xs text-gray-500 mb-4">{team.DivisionName} · {team.SeasonName}</div>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {saved && <p className="text-green-400 text-sm mb-3">Team name updated.</p>}
        <div className="mb-5">
          <label className="text-gray-400 text-xs block mb-1">Team Name</label>
          <div className="flex gap-2">
            <input type="text" value={name} onChange={e => { setName(e.target.value); setSaved(false) }}
              className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm"
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
            <button onClick={handleSave} disabled={saving || name.trim() === team.Name}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm px-3 py-2 rounded transition font-medium">
              {saving ? 'Saving…' : 'Rename'}
            </button>
          </div>
        </div>
        <div>
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
            Roster {!loading && `(${players.length} players)`}
          </h3>
          {loading ? (
            <p className="text-gray-500 text-sm py-4 text-center">Loading players…</p>
          ) : players.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No players on this team.</p>
          ) : (
            <ul className="space-y-1.5">
              {players.map(p => (
                <li key={p.PlayerID} className="flex items-center justify-between py-1.5 px-3 bg-gray-700/50 rounded text-sm">
                  <span className="text-white">{p.FirstName} {p.LastName}</span>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="bg-gray-600/80 px-1.5 py-0.5 rounded font-medium">{p.Position || '—'}</span>
                    {p.Position === 'G'
                      ? <span>GAA {p.Gaa != null ? Number(p.Gaa).toFixed(2) : '—'}</span>
                      : <span>{p.Goals ?? 0}G {p.Assists ?? 0}A</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={onClose}
          className="w-full mt-5 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg transition text-sm">
          Close
        </button>
      </div>
    </div>
  )
}

// ─── Shared helpers for team naming ──────────────────────────────────────────

function stripSeasonLabel(divKey) {
  return divKey.replace(/\s+\([^)]+\)$/, '').trim()
}

function makeDivPrefix(divisionName) {
  if (!divisionName || divisionName === '_unassigned') return 'Team'
  const stripped = divisionName
    .replace(/\b(division|league|group|pool|tier)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!stripped) return (divisionName.split(/\s+/)[0] || 'Team').slice(0, 6)
  const word = stripped.split(/\s+/)[0]
  return word.length <= 6 ? word : word.slice(0, 5)
}

// ─── Ready to Schedule — single group ────────────────────────────────────────

function ReadyToScheduleGroup({
  leagueName, divisionName, teams,
  leagues, divisions, seasons,
  onSaved, onDismiss, onScheduleGenerated, onDivisionCreated, onSeasonCreated, onLeagueCreated,
}) {
  const isUnassigned = divisionName === '_unassigned'
  const [localLeague, setLocalLeague] = useState(null)
  const leagueObj = localLeague || leagues.find(l => l.name === leagueName)

  // Auto-creates the league in DB if it doesn't exist yet; returns the league object
  const ensureLeague = async () => {
    if (leagueObj) return leagueObj
    const res  = await fetch('/api/league', {
      method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
      body: JSON.stringify({ name: leagueName }),
    })
    const data = await res.json()
    if (res.status === 409) {
      // League already exists in DB but wasn't in our local list — re-fetch to get it
      const fresh = await fetch('/api/leagues-divisions').then(r => r.json()).catch(() => null)
      const found = (fresh?.leagues || []).find(l => l.name.toLowerCase() === leagueName.toLowerCase())
      if (!found) throw new Error('League exists but could not be retrieved.')
      setLocalLeague(found)
      onLeagueCreated?.(found)
      return found
    }
    if (!res.ok) throw new Error(data.error || 'Failed to create league.')
    setLocalLeague(data.league)
    onLeagueCreated?.(data.league)
    return data.league
  }

  const leagueDivisions = leagueObj ? divisions.filter(d => d.leagueID === leagueObj.id) : []
  const leagueSeasons   = leagueObj
    ? [...seasons.filter(s => s.leagueID === leagueObj.id)].sort((a, b) => b.id - a.id)
    : []

  const divPrefix = makeDivPrefix(isUnassigned ? 'Team' : divisionName)

  const [localNames, setLocalNames] = useState(() =>
    teams.map((t, i) => t.teamName || `${divPrefix} ${i + 1}`)
  )
  const setName = (i, val) => setLocalNames(prev => prev.map((n, idx) => idx === i ? val : n))

  // Division — auto-match by name if possible
  const autoDiv = isUnassigned ? null : leagueObj
    ? divisions.find(d => d.name.toLowerCase() === divisionName.toLowerCase() && d.leagueID === leagueObj.id)
    : null
  const [divisionID,    setDivisionID]    = useState(() => autoDiv ? String(autoDiv.id) : '')
  const [showCreateDiv, setShowCreateDiv] = useState(false)
  const [newDivName,    setNewDivName]    = useState(isUnassigned ? '' : divisionName)
  const [creatingDiv,   setCreatingDiv]   = useState(false)
  const [divError,      setDivError]      = useState(null)

  // Season
  const [seasonID,         setSeasonID]         = useState('')
  const [showCreateSeason, setShowCreateSeason] = useState(false)
  const [newSeasonName,    setNewSeasonName]    = useState(() =>
    inferNextSeasonName(leagueSeasons[0]?.name || null, leagueName)
  )
  const [creatingSeason, setCreatingSeason] = useState(false)
  const [seasonError,    setSeasonError]    = useState(null)

  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)
  const [genTarget, setGenTarget] = useState(null)

  const selectedDivision = divisions.find(d => String(d.id) === divisionID)
  const selectedSeason   = seasons.find(s => String(s.id) === seasonID)
  const canSave = !!divisionID && !!seasonID

  const handleCreateDivision = async () => {
    if (!newDivName.trim()) { setDivError('Division name is required.'); return }
    setCreatingDiv(true); setDivError(null)
    let league
    try { league = await ensureLeague() } catch (e) { setDivError(e.message); setCreatingDiv(false); return }
    try {
      const res  = await fetch('/api/division', {
        method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
        body: JSON.stringify({ name: newDivName.trim(), leagueID: league.id }),
      })
      const data = await res.json()
      if (res.status === 409) {
        // Division already exists — find it in the current list or re-fetch to get its ID
        const trimmed = newDivName.trim().toLowerCase()
        let existing = divisions.find(d => d.name.toLowerCase() === trimmed && d.leagueID === league.id)
        if (!existing) {
          const fresh = await fetch('/api/leagues-divisions').then(r => r.json()).catch(() => null)
          if (fresh) {
            const freshDiv = (fresh.divisions || []).find(d => d.name.toLowerCase() === trimmed && d.leagueID === league.id)
            if (freshDiv) {
              onDivisionCreated?.(freshDiv)
              existing = freshDiv
            }
          }
        }
        if (existing) {
          setDivisionID(String(existing.id))
          setShowCreateDiv(false)
        } else {
          setDivError(data.error || 'Division already exists.')
        }
        setCreatingDiv(false); return
      }
      if (!res.ok) { setDivError(data.error || 'Failed to create division.'); setCreatingDiv(false); return }
      onDivisionCreated?.(data.division)
      setDivisionID(String(data.division.id))
      setShowCreateDiv(false)
    } catch { setDivError('Could not connect to server.') }
    setCreatingDiv(false)
  }

  const handleCreateSeason = async () => {
    if (!newSeasonName.trim()) { setSeasonError('Season name is required.'); return }
    setCreatingSeason(true); setSeasonError(null)
    let league
    try { league = await ensureLeague() } catch (e) { setSeasonError(e.message); setCreatingSeason(false); return }
    try {
      const res  = await fetch('/api/season', {
        method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
        body: JSON.stringify({ name: newSeasonName.trim(), leagueID: league.id }),
      })
      const data = await res.json()
      if (!res.ok) { setSeasonError(data.error || 'Failed to create season.'); setCreatingSeason(false); return }
      onSeasonCreated?.(data.season)
      setSeasonID(String(data.season.id))
      setShowCreateSeason(false)
      setNewSeasonName(inferNextSeasonName(data.season.name, leagueName))
    } catch { setSeasonError('Could not connect to server.') }
    setCreatingSeason(false)
  }

  const handleSaveAndSchedule = async () => {
    if (!divisionID) { setError('Choose or create a division first.'); return }
    if (!seasonID)   { setError('Choose or create a season first.'); return }

    setSaving(true); setError(null)
    let league
    try { league = await ensureLeague() } catch (e) { setError(e.message); setSaving(false); return }

    const teamPayload = teams.map((t, idx) => ({
      teamName: (localNames[idx] || `${divPrefix} ${idx + 1}`).trim(),
      players:  t.players || [],
    }))

    try {
      const res = await fetch('/api/scheduled-teams', {
        method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
        body: JSON.stringify({
          leagueID:   league.id,
          divisionID: Number(divisionID),
          seasonID:   Number(seasonID),
          teams:      teamPayload,
        }),
      })
      let data
      try { data = await res.json() }
      catch { setError('Server is not responding — make sure it is running.'); setSaving(false); return }
      if (!res.ok) { setError(data.error || 'Save failed.'); setSaving(false); return }

      // Remove from draft store
      fetch(`/api/draft-teams?leagueName=${encodeURIComponent(leagueName)}&divisionName=${encodeURIComponent(divisionName)}`, {
        method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      }).catch(() => {})

      // Open GenerateModal with the just-saved team IDs
      const savedTeams = data.savedTeams.map(t => ({ ScheduledTeamID: t.scheduledTeamID, Name: t.name }))
      setGenTarget({ teams: savedTeams, seasonID: Number(seasonID) })
      // Keep saving=true until modal resolves
    } catch {
      setError('Could not connect to server.')
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-green-700/40 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-green-900/15 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white font-semibold">{leagueName}</span>
          <span className="text-green-400 text-xs font-medium bg-green-900/40 border border-green-700/40 px-2 py-0.5 rounded-full">
            {teams.length} team{teams.length !== 1 ? 's' : ''} ready
          </span>
          {!leagueObj && (
            <span className="text-yellow-400 text-xs bg-yellow-900/30 border border-yellow-700/40 px-2 py-0.5 rounded-full">
              new league — will be created automatically
            </span>
          )}
          {!isUnassigned && divisionName !== '_unassigned' && (
            <span className="text-gray-400 text-xs">{divisionName}</span>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-500 hover:text-red-400 text-xs transition">
            Discard ✕
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-5">
        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-700/40 rounded-lg p-2.5">{error}</p>
        )}

        {/* Team names (compact inline edit) */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
            Team Names <span className="text-gray-600 font-normal normal-case">(click to rename)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {teams.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-700/60 border border-gray-600/60 rounded-lg px-2.5 py-1.5">
                <span className="text-gray-500 text-xs font-mono w-4 shrink-0">{i + 1}</span>
                <input
                  value={localNames[i] ?? ''}
                  onChange={e => setName(i, e.target.value)}
                  placeholder={`${divPrefix} ${i + 1}`}
                  className="flex-1 min-w-0 bg-transparent text-white text-sm focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Division (required) */}
        <div>
          <label className="text-gray-300 text-sm font-semibold block mb-2">
            Division <span className="text-red-400">*</span>
            {selectedDivision && <span className="text-green-400 font-normal text-xs ml-2">✓ {selectedDivision.name}</span>}
          </label>
          {!showCreateDiv ? (
            <div className="flex gap-2">
              {leagueDivisions.length === 0 ? (
                <p className="text-gray-500 text-sm flex-1">No divisions yet — create one.</p>
              ) : (
                <select value={divisionID} onChange={e => { setDivisionID(e.target.value); setError(null) }}
                  className="flex-1 p-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm min-w-0">
                  <option value="">Choose a division…</option>
                  {leagueDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              <button
                onClick={() => { setShowCreateDiv(true); setNewDivName(isUnassigned ? '' : divisionName) }}
                className="px-3 py-2 bg-gray-700 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white text-xs rounded-lg transition shrink-0">
                + New Division
              </button>
            </div>
          ) : (
            <div className="p-3 bg-gray-700/60 border border-blue-700/40 rounded-lg space-y-2">
              {divError && <p className="text-red-400 text-xs">{divError}</p>}
              <div className="flex gap-2">
                <input value={newDivName} autoFocus
                  onChange={e => { setNewDivName(e.target.value); setDivError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateDivision()}
                  placeholder="e.g. A Division"
                  className="flex-1 min-w-0 bg-gray-800 border border-gray-600 focus:border-blue-400 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none transition" />
                <button onClick={handleCreateDivision} disabled={creatingDiv}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-4 py-1.5 rounded-lg transition shrink-0">
                  {creatingDiv ? 'Creating…' : 'Create'}
                </button>
                <button onClick={() => setShowCreateDiv(false)}
                  className="text-gray-400 hover:text-white text-sm px-2 transition">✕</button>
              </div>
            </div>
          )}
        </div>

        {/* Season (required) */}
        <div>
          <label className="text-gray-300 text-sm font-semibold block mb-2">
            Season <span className="text-red-400">*</span>
            {selectedSeason && <span className="text-green-400 font-normal text-xs ml-2">✓ {selectedSeason.name}</span>}
          </label>
          {!showCreateSeason ? (
            <div className="flex gap-2">
              {leagueSeasons.length === 0 ? (
                <p className="text-gray-500 text-sm flex-1">No seasons yet — create one.</p>
              ) : (
                <select value={seasonID} onChange={e => { setSeasonID(e.target.value); setError(null) }}
                  className="flex-1 p-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm min-w-0">
                  <option value="">Choose a season…</option>
                  {leagueSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <button
                onClick={() => setShowCreateSeason(true)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white text-xs rounded-lg transition shrink-0">
                + New Season
              </button>
            </div>
          ) : (
            <div className="p-3 bg-gray-700/60 border border-blue-700/40 rounded-lg space-y-2">
              {seasonError && <p className="text-red-400 text-xs">{seasonError}</p>}
              <p className="text-gray-400 text-xs">Pre-filled based on the most recent season — edit as needed.</p>
              <div className="flex gap-2">
                <input value={newSeasonName} autoFocus
                  onChange={e => { setNewSeasonName(e.target.value); setSeasonError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateSeason()}
                  className="flex-1 min-w-0 bg-gray-800 border border-gray-600 focus:border-blue-400 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none transition" />
                <button onClick={handleCreateSeason} disabled={creatingSeason}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-4 py-1.5 rounded-lg transition shrink-0">
                  {creatingSeason ? 'Creating…' : 'Create'}
                </button>
                <button onClick={() => setShowCreateSeason(false)}
                  className="text-gray-400 hover:text-white text-sm px-2 transition">✕</button>
              </div>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex items-center gap-4 pt-1 border-t border-gray-700/60">
          <button onClick={handleSaveAndSchedule} disabled={saving || !canSave}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition">
            {saving ? 'Saving teams…' : 'Save & Generate Draft Schedule'}
          </button>
          {!canSave && (
            <p className="text-gray-500 text-xs">
              {!divisionID ? 'Choose a division to continue.' : 'Choose a season to continue.'}
            </p>
          )}
        </div>
      </div>

      {/* Schedule modal opens immediately after save */}
      {genTarget && (
        <GenerateModal
          teams={genTarget.teams}
          seasonID={genTarget.seasonID}
          onClose={() => { setGenTarget(null); setSaving(false); onSaved?.() }}
          onDone={(count) => { setGenTarget(null); onScheduleGenerated?.(count); onSaved?.() }}
        />
      )}
    </div>
  )
}

// ─── Ready to Schedule — section wrapper ─────────────────────────────────────

function ReadyToScheduleSection({ groups, leagues, divisions, seasons, onSaved, onDismiss, onScheduleGenerated, onDivisionCreated, onSeasonCreated, onLeagueCreated }) {
  if (groups.length === 0) return null
  const totalTeams = groups.reduce((n, g) => n + g.teams.length, 0)

  return (
    <div className="mb-7">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #4ade80' }} />
          <h2 className="text-white font-semibold">Ready to Schedule</h2>
        </div>
        <span className="text-gray-500 text-sm">
          — {totalTeams} team{totalTeams !== 1 ? 's' : ''} waiting to be drafted
        </span>
      </div>

      <div className="space-y-4">
        {groups.map(g => (
          <ReadyToScheduleGroup
            key={`${g.leagueName}|${g.divisionName}`}
            leagueName={g.leagueName}
            divisionName={g.divisionName}
            teams={g.teams}
            leagues={leagues}
            divisions={divisions}
            seasons={seasons}
            onSaved={() => onSaved(g.leagueName, g.divisionName)}
            onDismiss={onDismiss ? () => onDismiss(g.leagueName, g.divisionName) : null}
            onScheduleGenerated={onScheduleGenerated}
            onDivisionCreated={onDivisionCreated}
            onSeasonCreated={onSeasonCreated}
            onLeagueCreated={onLeagueCreated}
          />
        ))}
      </div>

      {/* Divider before tabs */}
      <div className="mt-7 border-t border-gray-700" />
    </div>
  )
}

// ─── Teams Tab (saved teams only) ────────────────────────────────────────────

function TeamsTab({ allScheduledTeams, onRefresh, loading }) {
  const grouped = {}
  allScheduledTeams.forEach(t => {
    const key = `${t.LeagueName} — ${t.DivisionName} (${t.SeasonName})`
    if (!grouped[key]) grouped[key] = { teams: [], seasonID: t.SeasonID }
    grouped[key].teams.push(t)
  })

  const hasGamesSet = new Set(
    allScheduledTeams.filter(t => t.hasGames).map(t => `${t.DivisionID}|${t.SeasonID}`)
  )

  const [genTarget,     setGenTarget]     = useState(null)
  const [genSuccess,    setGenSuccess]    = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editingTeam,   setEditingTeam]   = useState(null)

  const handleDelete = (id, name) => setConfirmDelete({ id, name })
  const doDelete = async () => {
    const { id } = confirmDelete
    setConfirmDelete(null)
    await fetch(`/api/scheduled-teams/${id}`, { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } })
    onRefresh()
  }

  // Only show groups that don't have a schedule yet
  const pendingEntries = Object.entries(grouped).filter(([, { teams, seasonID }]) =>
    !hasGamesSet.has(`${teams[0]?.DivisionID}|${seasonID}`)
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Loading teams…</p>
    </div>
  )

  if (pendingEntries.length === 0) return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center space-y-2">
      <p className="text-white font-medium">
        {Object.keys(grouped).length === 0 ? 'No saved teams yet' : 'All teams have schedules'}
      </p>
      <p className="text-gray-400 text-sm">
        {Object.keys(grouped).length === 0
          ? 'Use the Ready to Schedule section above to save generated teams and create a draft schedule.'
          : 'Every saved group already has a generated schedule. Manage games in the Draft Schedule and Published tabs.'}
      </p>
    </div>
  )

  return (
    <div className="space-y-4">
      {genSuccess && (
        <div className="bg-green-900/40 border border-green-700 rounded p-3 text-green-300 text-sm flex justify-between">
          {genSuccess}
          <button onClick={() => setGenSuccess(null)} className="text-green-500 hover:text-green-300 ml-4">✕</button>
        </div>
      )}

      {pendingEntries.map(([groupKey, { teams, seasonID }]) => {
        return (
          <div key={groupKey} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-700/50">
              <h3 className="text-white font-medium text-sm">{groupKey}</h3>
              <button
                onClick={() => setGenTarget({ teams, seasonID })}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition">
                Generate Schedule ({teams.length} teams)
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-700">
                  <th className="text-left px-4 py-2 w-8">#</th>
                  <th className="text-left px-4 py-2">Team Name</th>
                  <th className="text-left px-4 py-2">Players</th>
                  <th className="text-left px-4 py-2">Saved</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t, idx) => (
                  <tr key={t.ScheduledTeamID} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-2 text-gray-500 text-xs font-mono">{idx + 1}</td>
                    <td className="px-4 py-2 text-white font-medium">{t.Name}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{t.playerCount ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{t.EnteredDate || '—'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => setEditingTeam(t)}
                        className="text-blue-400 hover:text-blue-300 text-xs mr-3">Edit</button>
                      <button onClick={() => handleDelete(t.ScheduledTeamID, t.Name)}
                        className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {genTarget && (
        <GenerateModal
          teams={genTarget.teams}
          seasonID={genTarget.seasonID}
          onClose={() => setGenTarget(null)}
          onDone={(count) => {
            setGenTarget(null)
            invalidateCalendarCache()
            setGenSuccess(`Generated ${count} draft games. Switch to the "Draft Schedule" tab to review and publish.`)
            onRefresh()
          }}
        />
      )}

      {editingTeam && (
        <TeamEditModal
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSaved={() => { onRefresh() }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Team"
          message={`Delete "${confirmDelete.name}" and all associated games? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ─── Games Tab ────────────────────────────────────────────────────────────────

function GamesTab({ status, filters, allScheduledTeams, onPublishToggle }) {
  const [games,        setGames]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [view,         setView]         = useState('calendar')
  const [editing,      setEditing]      = useState(null)
  const [viewing,      setViewing]      = useState(null)
  const [selected,     setSelected]     = useState(new Set())
  const [confirmState, setConfirmState] = useState(null)
  const [genTarget,    setGenTarget]    = useState(null)
  const [genSuccess,   setGenSuccess]   = useState(null)

  const isDraft = status === 'Draft'

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status })
    if (filters.leagueID)   params.set('leagueID',   filters.leagueID)
    if (filters.divisionID) params.set('divisionID', filters.divisionID)
    if (filters.seasonID)   params.set('seasonID',   filters.seasonID)
    const res  = await fetch(`/api/games?${params}`)
    const data = await res.json()
    setGames(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [status, filters])

  useEffect(() => { load() }, [load])

  const confirm     = (title, message, onConfirm) => setConfirmState({ title, message, onConfirm })
  const closeConfirm = () => setConfirmState(null)

  const handleDelete = (id) => {
    confirm('Delete Game', 'Remove this game permanently?', async () => {
      closeConfirm()
      await fetch(`/api/games/${id}`, { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } })
      load()
    })
  }

  const handlePublishSelected = async () => {
    if (selected.size === 0) return
    await fetch('/api/games/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
      body: JSON.stringify({ gameIDs: [...selected] }),
    })
    clearScheduleCache(); setSelected(new Set()); load(); onPublishToggle?.()
  }

  const handleUnpublishSelected = async () => {
    if (selected.size === 0) return
    await fetch('/api/games/unpublish', {
      method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
      body: JSON.stringify({ gameIDs: [...selected] }),
    })
    clearScheduleCache(); setSelected(new Set()); load(); onPublishToggle?.()
  }

  const handlePublishAll = () => {
    if (!filters.divisionID || !filters.seasonID) {
      confirm('Filter Required', 'Select a specific division and season first, then use Publish All.', closeConfirm)
      return
    }
    confirm('Publish All Games', 'Move all Draft games for this division to Published?', async () => {
      closeConfirm()
      await fetch('/api/games/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
        body: JSON.stringify({ divisionID: Number(filters.divisionID), seasonID: Number(filters.seasonID) }),
      })
      clearScheduleCache(); load(); onPublishToggle?.()
    })
  }

  const handleUnpublishAll = () => {
    if (!filters.divisionID || !filters.seasonID) {
      confirm('Filter Required', 'Select a specific division and season first, then use Unpublish All.', closeConfirm)
      return
    }
    confirm('Unpublish All Games', 'Move all published games for this division back to Draft?', async () => {
      closeConfirm()
      await fetch('/api/games/unpublish', {
        method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
        body: JSON.stringify({ divisionID: Number(filters.divisionID), seasonID: Number(filters.seasonID) }),
      })
      clearScheduleCache(); load(); onPublishToggle?.()
    })
  }

  const handleDateClick = (info) => {
    const dateStr    = info.dateStr
    const gamesOnDay = games.filter(g => g.GameDate === dateStr)
    if (gamesOnDay.length === 0) {
      setEditing({ _prefillDate: dateStr })
    } else if (isDraft) {
      confirm(
        `Delete Games on ${fmt(dateStr)}`,
        `This will permanently delete ${gamesOnDay.length} game${gamesOnDay.length === 1 ? '' : 's'} on this date.`,
        async () => {
          closeConfirm()
          await fetch('/api/games/by-date', {
            method: 'DELETE', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
            body: JSON.stringify({
              date:       dateStr,
              divisionID: filters.divisionID ? Number(filters.divisionID) : undefined,
              seasonID:   filters.seasonID   ? Number(filters.seasonID)   : undefined,
            }),
          })
          load()
        }
      )
    }
  }

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleAll = () => setSelected(prev =>
    prev.size === games.length ? new Set() : new Set(games.map(g => g.GameID))
  )

  const events = games.map(g => ({
    id:              String(g.GameID),
    title:           `${g.HomeTeamName} vs ${g.AwayTeamName}`,
    start:           g.GameDate,
    backgroundColor: isDraft ? '#b45309' : '#15803d',
    borderColor:     'transparent',
    textColor:       '#fff',
    extendedProps:   g,
  }))

  const initialDate = games[0]?.GameDate || new Date().toISOString().split('T')[0]

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>

  return (
    <div>
      <style>{CALENDAR_CSS}</style>

      {genSuccess && (
        <div className="bg-green-900/40 border border-green-700 rounded p-3 text-green-300 text-sm flex justify-between mb-4">
          {genSuccess}
          <button onClick={() => setGenSuccess(null)} className="text-green-500 hover:text-green-300 ml-4">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setView('calendar')}
            className={`px-3 py-1.5 rounded text-sm transition ${view === 'calendar' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            Calendar
          </button>
          <button onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded text-sm transition ${view === 'list' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            List ({games.length})
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isDraft && filters.divisionID && filters.seasonID && allScheduledTeams.length >= 2 && (
            <button
              onClick={() => setGenTarget({ teams: allScheduledTeams, seasonID: filters.seasonID })}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded transition font-medium">
              Generate Schedule
            </button>
          )}
          <button onClick={() => setEditing('new')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded transition">
            + Add Game
          </button>
          {selected.size > 0 && isDraft && (
            <button onClick={handlePublishSelected}
              className="bg-green-700 hover:bg-green-600 text-white text-sm px-3 py-1.5 rounded transition">
              Publish Selected ({selected.size})
            </button>
          )}
          {selected.size > 0 && !isDraft && (
            <button onClick={handleUnpublishSelected}
              className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm px-3 py-1.5 rounded transition">
              Unpublish Selected ({selected.size})
            </button>
          )}
          {isDraft && games.length > 0 && (
            <button onClick={handlePublishAll}
              className="bg-green-800 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded transition">
              Publish All
            </button>
          )}
          {!isDraft && games.length > 0 && (
            <button onClick={handleUnpublishAll}
              className="bg-gray-600 hover:bg-gray-500 text-white text-sm px-3 py-1.5 rounded transition">
              Unpublish All
            </button>
          )}
        </div>
      </div>

      {view === 'calendar' && (
        <p className="text-gray-500 text-xs mb-2 italic">
          {isDraft
            ? 'Click an empty date to add a game. Click a date with games to delete them all.'
            : 'Click a game to view details and edit it. Click an empty date to add a game.'}
        </p>
      )}

      {games.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">
          {isDraft
            ? 'No draft games. Generate a schedule from the Teams tab or using the Ready to Schedule section.'
            : 'No published games yet.'}
        </p>
      ) : view === 'calendar' ? (
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={initialDate}
            events={events}
            eventClick={info => setViewing(info.event.extendedProps)}
            dateClick={handleDateClick}
            headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
            height="auto"
            dayMaxEvents={3}
          />
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-700 bg-gray-700/50">
                <th className="px-3 py-2 text-left">
                  <input type="checkbox" checked={selected.size === games.length && games.length > 0}
                    onChange={toggleAll} className="cursor-pointer" />
                </th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Home</th>
                <th className="px-3 py-2 text-left">Away</th>
                <th className="px-3 py-2 text-left">Score</th>
                <th className="px-3 py-2 text-left">Rink</th>
                <th className="px-3 py-2 text-left">Division</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.GameID} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(g.GameID)} onChange={() => toggleSelect(g.GameID)} className="cursor-pointer" />
                  </td>
                  <td className="px-3 py-2 text-white whitespace-nowrap">{fmt(g.GameDate)}</td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{fmtTime(g.GameTime)}</td>
                  <td className="px-3 py-2 text-white">{g.HomeTeamName}</td>
                  <td className="px-3 py-2 text-white">{g.AwayTeamName}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                    {g.HomeTeamScore != null ? `${g.HomeTeamScore}–${g.AwayTeamScore}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{g.Rink || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{g.DivisionName}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setViewing(g)} className="text-gray-400 hover:text-white text-xs mr-2">View</button>
                    <button onClick={() => setEditing(g)} className="text-blue-400 hover:text-blue-300 text-xs mr-3">Edit</button>
                    <button onClick={() => handleDelete(g.GameID)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <GameDetailModal
          game={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null) }}
          onDelete={() => { setViewing(null); handleDelete(viewing.GameID) }}
        />
      )}

      {editing && (
        <GameModal
          game={editing === 'new' || editing?._prefillDate ? null : editing}
          prefillDate={editing?._prefillDate}
          allTeams={allScheduledTeams}
          onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); load() }}
        />
      )}

      {genTarget && (
        <GenerateModal
          teams={genTarget.teams}
          seasonID={genTarget.seasonID}
          onClose={() => setGenTarget(null)}
          onDone={(count) => {
            setGenTarget(null)
            setGenSuccess(`Generated ${count} draft games.`)
            load()
          }}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel="Confirm"
          danger={true}
          onConfirm={confirmState.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR / STRUCTURE TAB — components from the former CalendarManager page
// ═══════════════════════════════════════════════════════════════════════════════

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

const DIV_COLORS = {
  'A League': '#16a34a', 'B League': '#1d7aab', 'C League': '#7c3aed',
  'A/B League': '#c2610c', 'C/B League': '#c0392b',
  '10U A': '#b45309', '10U B': '#0d9488', '12U A': '#b94000',
  '12U B': '#6d28d9', '14U A': '#1e6fa5', '14U B': '#991b1b',
}
function calDivColor(name) { return DIV_COLORS[name] || '#6b7280' }

function calFormatDate(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${m}/${d}/${y}`
}

function detectConflicts(games) {
  const conflicts = []
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

function calAuthHeaders() {
  return { [AUTH_HEADER_KEY]: getAuthToken(), 'Content-Type': 'application/json' }
}

// ─── Cal: Game Edit Modal ──────────────────────────────────────────────────────

function CalGameEditModal({ game, teams, form, onChange, onSave, onDelete, onCancel, saving }) {
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

// ─── Cal: Conflict Panel ───────────────────────────────────────────────────────

function ConflictPanel({ conflicts, onEditGame }) {
  const [open, setOpen] = useState(true)
  if (conflicts.length === 0) return null
  return (
    <div className="mb-5 border border-red-700 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-red-900/40 hover:bg-red-900/60 transition text-left">
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
                  ? `⚠ Team double-booked on ${calFormatDate(c.date)}: ${c.teamName} has ${c.games.length} games`
                  : `⚠ Rink double-booked: ${c.rink} on ${calFormatDate(c.date)} at ${c.time}`}
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
                    <button onClick={() => onEditGame(g)}
                      className="text-xs text-blue-400 hover:text-blue-300 underline shrink-0 transition">
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

// ─── Cal: Calendar Tab ─────────────────────────────────────────────────────────

function CalendarViewTab({
  filteredGames, calEvents,
  uniqueLeagues, uniqueDivisions,
  leagueFilter, setLeagueFilter,
  divisionFilter, setDivisionFilter,
  statusFilter, setStatusFilter,
  onEventClick, onEventDrop,
  conflicts, onEditGame,
}) {
  return (
    <div>
      <ConflictPanel conflicts={conflicts} onEditGame={onEditGame} />
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <span className="text-gray-400 text-sm">
          {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-2 ml-auto flex-wrap">
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
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
          </select>
        </div>
      </div>
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 admin-cal">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
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

// ─── Cal: Structure Tab ────────────────────────────────────────────────────────

function StructureTab({
  leagues, divisions, seasons, teams,
  teamsByDivision, teamsByLeague,
  onDeleteTeam, onDeleteDivision, onDeleteLeague, onDeleteSeason,
}) {
  if (!leagues || leagues.length === 0) {
    return (
      <div className="text-gray-500 py-12 text-center">
        No active leagues found. Save teams first.
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <p className="text-gray-500 text-sm">
        Showing only leagues with active teams. Deleting a league removes all its divisions, seasons, teams, and games.
      </p>
      {leagues.map(league => {
        const leagueDivisions = divisions.filter(d => d.leagueID === league.id && (teamsByDivision[d.id] || 0) > 0)
        const leagueSeasons   = seasons.filter(s => s.leagueID === league.id)
        const teamCount       = teamsByLeague[league.id] || 0
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
                          <span className="ml-3 text-gray-500 text-xs">{divTeams.length} team{divTeams.length !== 1 ? 's' : ''}</span>
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

// ─── Cal: Section wrapper (handles data loading for calendar+structure tabs) ───

let _calendarCache = null
function invalidateCalendarCache() { _calendarCache = null }

function CalendarSection({ view, onStructureChange }) {
  const [teams,      setTeams]      = useState(_calendarCache?.teams      ?? [])
  const [games,      setGames]      = useState(_calendarCache?.games      ?? [])
  const [leaguesData, setLeaguesData] = useState(_calendarCache?.leaguesData ?? { leagues: [], divisions: [], seasons: [] })
  const [loading,    setLoading]    = useState(!_calendarCache)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  const [leagueFilter,   setLeagueFilter]   = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')

  const [editGame,    setEditGame]    = useState(null)
  const [editForm,    setEditForm]    = useState({})
  const [savingEdit,  setSavingEdit]  = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)
  const [deleting,    setDeleting]    = useState(false)

  const loadData = useCallback(async () => {
    if (_calendarCache) return
    setLoading(true); setError('')
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
      setTeams(t); setGames(g); setLeaguesData(l)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function flashSuccess(msg) { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  function openEdit(game) {
    setEditGame(game)
    setEditForm({
      HomeTeamID: game.HomeTeamID, AwayTeamID: game.AwayTeamID,
      GameDate: game.GameDate, GameTime: game.GameTime || '',
      Rink: game.Rink || '', CurrentGameStatus: game.CurrentGameStatus,
    })
  }

  async function saveEdit() {
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/games/${editGame.GameID}`, {
        method: 'PUT', headers: calAuthHeaders(), body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Failed to save')
      const homeName = teams.find(t => t.ScheduledTeamID === editForm.HomeTeamID)?.Name || editGame.HomeTeamName
      const awayName = teams.find(t => t.ScheduledTeamID === editForm.AwayTeamID)?.Name || editGame.AwayTeamName
      setGames(prev => {
        const next = prev.map(g => g.GameID === editGame.GameID ? { ...g, ...editForm, HomeTeamName: homeName, AwayTeamName: awayName } : g)
        if (_calendarCache) _calendarCache = { ..._calendarCache, games: next }
        return next
      })
      setEditGame(null); flashSuccess('Game updated')
    } catch (e) { setError(e.message) }
    finally { setSavingEdit(false) }
  }

  async function doDeleteGame(gameID) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/games/${gameID}`, { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } })
      if (!res.ok) throw new Error('Failed to delete game')
      setGames(prev => {
        const next = prev.filter(g => g.GameID !== gameID)
        if (_calendarCache) _calendarCache = { ..._calendarCache, games: next }
        return next
      })
      flashSuccess('Game deleted')
    } catch (e) { setError(e.message) }
    finally { setDeleting(false); setConfirmModal(null) }
  }

  async function handleEventDrop({ event, revert }) {
    const gameID  = Number(event.id)
    const newDate = event.startStr.split('T')[0]
    const hasTime = event.startStr.includes('T')
    const newTime = hasTime ? event.startStr.split('T')[1].substring(0, 5) : null
    try {
      const body = { GameDate: newDate }
      if (newTime) body.GameTime = newTime
      const res = await fetch(`/api/games/${gameID}`, { method: 'PUT', headers: calAuthHeaders(), body: JSON.stringify(body) })
      if (!res.ok) { revert(); throw new Error('Failed to move game') }
      setGames(prev => {
        const next = prev.map(g => g.GameID === gameID ? { ...g, GameDate: newDate, ...(newTime ? { GameTime: newTime } : {}) } : g)
        if (_calendarCache) _calendarCache = { ..._calendarCache, games: next }
        return next
      })
      flashSuccess('Game moved')
    } catch (e) { revert(); setError(e.message) }
  }

  async function doDeleteTeam(teamId) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/scheduled-teams/${teamId}`, { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } })
      if (!res.ok) throw new Error('Failed to delete team')
      setTeams(prev => { const next = prev.filter(t => t.ScheduledTeamID !== teamId); if (_calendarCache) _calendarCache = { ..._calendarCache, teams: next }; return next })
      setGames(prev => { const next = prev.filter(g => g.HomeTeamID !== teamId && g.AwayTeamID !== teamId); if (_calendarCache) _calendarCache = { ..._calendarCache, games: next }; return next })
      flashSuccess('Team and all its games deleted')
    } catch (e) { setError(e.message) }
    finally { setDeleting(false); setConfirmModal(null) }
  }

  async function reloadAfterStructureChange() {
    invalidateCalendarCache()
    onStructureChange?.()
    setLoading(true)
    await loadData()
  }

  async function doDeleteDivision(divisionId) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/division/${divisionId}`, { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      await reloadAfterStructureChange(); flashSuccess('Division deleted')
    } catch (e) { setError(e.message) }
    finally { setDeleting(false); setConfirmModal(null) }
  }

  async function doDeleteLeague(leagueId) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/league/${leagueId}`, { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      await reloadAfterStructureChange(); flashSuccess('League deleted')
    } catch (e) { setError(e.message) }
    finally { setDeleting(false); setConfirmModal(null) }
  }

  async function doDeleteSeason(seasonId) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/season/${seasonId}`, { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      await reloadAfterStructureChange(); flashSuccess('Season deleted')
    } catch (e) { setError(e.message) }
    finally { setDeleting(false); setConfirmModal(null) }
  }

  const uniqueLeagues = useMemo(() =>
    [...new Map(games.map(g => [g.LeagueID, { id: g.LeagueID, name: g.LeagueName }])).values()], [games])
  const uniqueDivisions = useMemo(() => {
    const src = leagueFilter ? games.filter(g => g.LeagueID === Number(leagueFilter)) : games
    return [...new Map(src.map(g => [g.DivisionID, { id: g.DivisionID, name: g.DivisionName }])).values()]
  }, [games, leagueFilter])

  const filteredGames = useMemo(() => games.filter(g => {
    if (leagueFilter   && g.LeagueID   !== Number(leagueFilter))   return false
    if (divisionFilter && g.DivisionID !== Number(divisionFilter)) return false
    if (statusFilter   && g.CurrentGameStatus !== statusFilter)    return false
    return true
  }), [games, leagueFilter, divisionFilter, statusFilter])

  const calEvents = useMemo(() => filteredGames.map(g => ({
    id: String(g.GameID),
    title: `${g.HomeTeamName} vs ${g.AwayTeamName}`,
    start: g.GameTime ? `${g.GameDate}T${g.GameTime}` : g.GameDate,
    backgroundColor: calDivColor(g.DivisionName),
    borderColor: 'transparent', textColor: '#fff', extendedProps: g,
  })), [filteredGames])

  const conflicts = useMemo(() => detectConflicts(games), [games])

  const teamsByDivision = useMemo(() =>
    teams.reduce((acc, t) => { acc[t.DivisionID] = (acc[t.DivisionID] || 0) + 1; return acc }, {}), [teams])
  const teamsByLeague = useMemo(() =>
    teams.reduce((acc, t) => { acc[t.LeagueID] = (acc[t.LeagueID] || 0) + 1; return acc }, {}), [teams])

  const { leagues = [], divisions = [], seasons = [] } = leaguesData
  const activeLeagues = leagues.filter(l => (teamsByLeague[l.id] || 0) > 0)

  return (
    <div>
      <style>{ADMIN_CAL_CSS}</style>

      {error && (
        <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded text-sm">
          {error} <button className="ml-3 underline" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded text-sm">{success}</div>
      )}

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : view === 'calendar' ? (
        <CalendarViewTab
          filteredGames={filteredGames} calEvents={calEvents}
          uniqueLeagues={uniqueLeagues} uniqueDivisions={uniqueDivisions}
          leagueFilter={leagueFilter}
          setLeagueFilter={v => { setLeagueFilter(v); setDivisionFilter('') }}
          divisionFilter={divisionFilter} setDivisionFilter={setDivisionFilter}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          onEventClick={info => openEdit(info.event.extendedProps)}
          onEventDrop={handleEventDrop}
          conflicts={conflicts} onEditGame={openEdit}
        />
      ) : (
        <StructureTab
          leagues={activeLeagues} divisions={divisions} seasons={seasons} teams={teams}
          teamsByDivision={teamsByDivision} teamsByLeague={teamsByLeague}
          onDeleteTeam={team => setConfirmModal({
            title: `Delete team "${team.Name}"?`,
            message: `This removes the team from ${team.DivisionName} and deletes all its scheduled games.`,
            onConfirm: () => doDeleteTeam(team.ScheduledTeamID),
          })}
          onDeleteDivision={div => setConfirmModal({
            title: `Delete division "${div.name}"?`,
            message: `This will delete all ${teamsByDivision[div.id] || 0} team(s) and their games.`,
            onConfirm: () => doDeleteDivision(div.id),
          })}
          onDeleteLeague={league => setConfirmModal({
            title: `Delete entire league "${league.name}"?`,
            message: `This will delete all ${teamsByLeague[league.id] || 0} team(s), divisions, seasons, and games.`,
            onConfirm: () => doDeleteLeague(league.id),
          })}
          onDeleteSeason={season => setConfirmModal({
            title: `Delete season "${season.name}"?`,
            message: 'This will delete all teams and games in this season.',
            onConfirm: () => doDeleteSeason(season.id),
          })}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel="Delete"
          danger={true}
          busy={deleting}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {editGame && (
        <CalGameEditModal
          game={editGame} teams={teams} form={editForm} onChange={setEditForm}
          onSave={saveEdit}
          onDelete={() => {
            const g = editGame; setEditGame(null)
            setConfirmModal({
              title: `Delete game on ${calFormatDate(g.GameDate)}: ${g.HomeTeamName} vs ${g.AwayTeamName}?`,
              message: 'This removes the game permanently.',
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

// ─── Module-level cache ───────────────────────────────────────────────────────
let _smLeagueCache = null

// ─── Main ScheduleManager Page ────────────────────────────────────────────────

export default function ScheduleManager({ allTeams: dashboardTeams = {}, onDeleteDivision }) {
  const [tab,     setTab]     = useState('teams')
  const [filters, setFilters] = useState({ leagueID: null, divisionID: null, seasonID: null })

  const [persistedDraftTeams, setPersistedDraftTeams] = useState({})
  const [scheduleSuccess,     setScheduleSuccess]     = useState(null)

  useEffect(() => {
    fetch('/api/draft-teams')
      .then(r => r.json())
      .then(data => setPersistedDraftTeams(data || {}))
      .catch(() => {})
    fetch('/api/scheduled-teams/empty',       { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } }).catch(() => {})
    fetch('/api/scheduled-teams/deduplicate', { method: 'DELETE', headers: { [AUTH_HEADER_KEY]: getAuthToken() } }).catch(() => {})
  }, [])

  const mergedDraftTeams = useMemo(() => {
    const result = {}
    for (const [league, divMap] of Object.entries(persistedDraftTeams)) {
      result[league] = { ...divMap }
    }
    for (const [league, divMap] of Object.entries(dashboardTeams)) {
      result[league] = { ...(result[league] || {}), ...divMap }
    }
    return result
  }, [persistedDraftTeams, dashboardTeams])

  const [leagues,   setLeagues]   = useState(_smLeagueCache?.leagues   ?? [])
  const [divisions, setDivisions] = useState(_smLeagueCache?.divisions ?? [])
  const [seasons,   setSeasons]   = useState(_smLeagueCache?.seasons   ?? [])

  const [allSavedTeams, setAllSavedTeams] = useState([])
  const [filteredTeams, setFilteredTeams] = useState([])
  const [teamsKey,      setTeamsKey]      = useState(0)
  const [teamsLoading,  setTeamsLoading]  = useState(true)

  useEffect(() => {
    fetch('/api/leagues-divisions').then(r => r.json()).then(data => {
      const cache = {
        leagues:   data.leagues   || [],
        divisions: data.divisions || [],
        seasons:   data.seasons   || [],
      }
      _smLeagueCache = cache
      setLeagues(cache.leagues)
      setDivisions(cache.divisions)
      setSeasons(cache.seasons)
    }).catch(() => {})
  }, [])

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true)
    const hasFilter = filters.leagueID || filters.divisionID || filters.seasonID
    try {
      if (!hasFilter) {
        const data  = await fetch('/api/scheduled-teams').then(r => r.json())
        const teams = Array.isArray(data) ? data : []
        setAllSavedTeams(teams); setFilteredTeams(teams)
      } else {
        const params = new URLSearchParams()
        if (filters.leagueID)   params.set('leagueID',   filters.leagueID)
        if (filters.divisionID) params.set('divisionID', filters.divisionID)
        if (filters.seasonID)   params.set('seasonID',   filters.seasonID)
        const [all, filtered] = await Promise.all([
          fetch('/api/scheduled-teams').then(r => r.json()).catch(() => []),
          fetch(`/api/scheduled-teams?${params}`).then(r => r.json()).catch(() => []),
        ])
        setAllSavedTeams(Array.isArray(all)      ? all      : [])
        setFilteredTeams(Array.isArray(filtered) ? filtered : [])
      }
    } catch { /* server not reachable */ }
    setTeamsLoading(false)
  }, [filters, teamsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadTeams() }, [loadTeams])

  const refresh = () => setTeamsKey(k => k + 1)

  // Compute unsaved groups (generated but not yet saved to DB)
  const savedCombos = new Set(allSavedTeams.map(t => `${t.LeagueName}|${t.DivisionName}`))
  const unsavedGroups = []
  for (const [leagueName, divMap] of Object.entries(mergedDraftTeams)) {
    for (const [divisionKey, teamMap] of Object.entries(divMap)) {
      const divisionName = stripSeasonLabel(divisionKey)
      const comboKey = `${leagueName}|${divisionName}`
      if (divisionName === '_unassigned' || !savedCombos.has(comboKey)) {
        const teams = Object.entries(teamMap)
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
          .map(([, v]) => v)
        unsavedGroups.push({ leagueName, divisionName, teams })
      }
    }
  }

  const handleDraftSaved = (leagueName, divisionName) => {
    invalidateCalendarCache()
    setPersistedDraftTeams(prev => {
      const next = { ...prev }
      if (next[leagueName]) {
        next[leagueName] = { ...next[leagueName] }
        delete next[leagueName][divisionName]
        if (Object.keys(next[leagueName]).length === 0) delete next[leagueName]
      }
      return next
    })
    refresh()
  }

  const handleScheduleGenerated = (count) => {
    invalidateCalendarCache()
    setScheduleSuccess(`${count} draft game${count !== 1 ? 's' : ''} generated — review and publish them in the Draft Schedule tab.`)
    setTab('draft')
  }

  const handleLeagueCreated = (league) => {
    setLeagues(prev => {
      const next = [...prev, league]
      if (_smLeagueCache) _smLeagueCache = { ..._smLeagueCache, leagues: next }
      return next
    })
  }

  const handleDivisionCreated = (div) => {
    setDivisions(prev => {
      const next = [...prev, div]
      if (_smLeagueCache) _smLeagueCache = { ..._smLeagueCache, divisions: next }
      return next
    })
  }

  const handleSeasonCreated = (season) => {
    setSeasons(prev => {
      const next = [...prev, season]
      if (_smLeagueCache) _smLeagueCache = { ..._smLeagueCache, seasons: next }
      return next
    })
  }

  // Per-tab team pools for the filter bar:
  // - Teams tab:     teams with no games yet (pending schedule)
  // - Draft tab:     teams that have at least one Draft game
  // - Published tab: teams that have at least one non-Draft game
  // - Other tabs:    all saved teams
  const filterPool = useMemo(() => {
    if (tab === 'draft')     return allSavedTeams.filter(t => t.hasDraftGames)
    if (tab === 'published') return allSavedTeams.filter(t => t.hasPublishedGames)
    if (tab === 'teams')     return allSavedTeams.filter(t => !t.hasGames)
    return allSavedTeams
  }, [tab, allSavedTeams])

  const savedLeagueIDs = new Set(filterPool.map(t => t.LeagueID))
  const leaguesForBar  = leagues.filter(l => savedLeagueIDs.has(l.id))

  // Cascade: divisions narrow by selected league; seasons narrow by selected league+division
  const teamsInLeague   = filters.leagueID
    ? filterPool.filter(t => t.LeagueID === Number(filters.leagueID))
    : filterPool
  const teamsInDivision = filters.divisionID
    ? teamsInLeague.filter(t => t.DivisionID === Number(filters.divisionID))
    : teamsInLeague
  const divisionsForBar = divisions.filter(d =>
    new Set(teamsInLeague.map(t => t.DivisionID)).has(d.id)
  )
  const seasonsForBar   = seasons.filter(s =>
    new Set(teamsInDivision.map(t => t.SeasonID)).has(s.id)
  )

  const TABS = [
    { id: 'teams',     label: 'Saved Teams' },
    { id: 'draft',     label: 'Draft Schedule' },
    { id: 'published', label: 'Published' },
    { id: 'calendar',  label: 'Edit Calendar' },
    { id: 'structure', label: 'Leagues & Divisions' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Schedule Manager</h1>
      <p className="text-gray-400 text-sm mb-6">
        Save generated teams to a season, draft a schedule, then publish it to the public site.
      </p>

      {/* Success toast after generating a schedule */}
      {scheduleSuccess && (
        <div className="flex items-center gap-3 bg-green-900/40 border border-green-700/60 rounded-lg px-4 py-3 mb-5 text-sm">
          <span className="text-green-400 text-base leading-none">✓</span>
          <span className="text-green-300 flex-1">{scheduleSuccess}</span>
          <button onClick={() => setScheduleSuccess(null)} className="text-green-600 hover:text-green-400 transition">✕</button>
        </div>
      )}

      {/* ── Ready to Schedule section — above tabs, shown when draft teams exist ── */}
      {unsavedGroups.length > 0 && (
        <ReadyToScheduleSection
          groups={unsavedGroups}
          leagues={leagues}
          divisions={divisions}
          seasons={seasons}
          onSaved={handleDraftSaved}
          onDismiss={onDeleteDivision ? (ln, dn) => onDeleteDivision(ln, dn) : null}
          onScheduleGenerated={handleScheduleGenerated}
          onLeagueCreated={handleLeagueCreated}
          onDivisionCreated={handleDivisionCreated}
          onSeasonCreated={handleSeasonCreated}
        />
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-gray-700 pb-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { if (t.id !== tab) { setTab(t.id); setFilters({ leagueID: null, divisionID: null, seasonID: null }) } }}
            className={`px-4 py-2 text-sm font-medium rounded-t transition -mb-px border-b-2 ${
              tab === t.id
                ? 'text-white border-red-500 bg-gray-800'
                : 'text-gray-400 border-transparent hover:text-white hover:border-gray-500'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter bar — only when there are saved teams to filter */}
      {leaguesForBar.length > 0 && (
        <FilterBar
          leagues={leaguesForBar}
          divisions={divisionsForBar}
          seasons={seasonsForBar}
          filters={filters}
          onChange={f => setFilters(f)}
        />
      )}

      {/* Tab content */}
      {tab === 'teams' && (
        <TeamsTab
          allScheduledTeams={filteredTeams}
          onRefresh={refresh}
          loading={teamsLoading}
        />
      )}
      {tab === 'draft' && (
        <GamesTab
          status="Draft"
          filters={filters}
          allScheduledTeams={filteredTeams}
          onPublishToggle={() => {}}
        />
      )}
      {tab === 'published' && (
        <>
          <div className="flex items-center gap-2 bg-green-900/20 border border-green-700/40 rounded-lg px-4 py-2.5 mb-4 text-sm">
            <span className="text-green-400">●</span>
            <span className="text-green-300 font-medium">Live on site</span>
            <span className="text-green-400/60 text-xs">— these games are visible to the public. You can still edit or unpublish any game here.</span>
          </div>
          <GamesTab
            status="Scheduled"
            filters={filters}
            allScheduledTeams={filteredTeams}
            onPublishToggle={() => {}}
          />
        </>
      )}
      {(tab === 'calendar' || tab === 'structure') && (
        <CalendarSection
          view={tab}
          onStructureChange={() => { _smLeagueCache = null }}
        />
      )}
    </div>
  )
}
