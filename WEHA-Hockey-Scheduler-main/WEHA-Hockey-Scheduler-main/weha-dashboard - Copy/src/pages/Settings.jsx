// Settings page — lets admins manage the core reference data stored in the DB:
// leagues, divisions, seasons, and individual players.
//
// Structure: each entity type lives in its own Panel component (LeaguePanel,
// DivisionPanel, SeasonPanel, PlayerPanel) rendered inside a shared Section
// wrapper. All panels share the same onRefresh callback so adding a league
// refreshes the division panel's dropdown automatically.
//
// The PlayerPanel has its own internal pagination (20 per page) and search
// filter because the player list can be very long.
import { useState, useEffect } from 'react'
import { getAuthToken, AUTH_HEADER_KEY } from '../context/Authentication'

// ─── Shared helpers ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-white mb-5 pb-3 border-b border-gray-700">{title}</h2>
      {children}
    </div>
  )
}

function Msg({ msg }) {
  if (!msg) return null
  return (
    <p className={`text-sm mt-2 ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
      {msg.text}
    </p>
  )
}

// ─── League Panel ──────────────────────────────────────────────────────────────

function LeaguePanel({ leagues, onRefresh }) {
  const [name,    setName]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState(null)

  const handleAdd = async () => {
    if (!name.trim()) { setMsg({ type: 'err', text: 'League name is required.' }); return }
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error || 'Failed to add league.' }); return }
      setMsg({ type: 'ok', text: `League "${data.league.name}" added.` })
      setName('')
      onRefresh()
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex gap-2 items-end mb-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs uppercase tracking-wide font-semibold">League Name</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setMsg(null) }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. Adult League"
            className="bg-gray-700 border border-gray-600 focus:border-blue-400 text-white rounded px-3 py-2 text-sm w-60 focus:outline-none transition"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition self-end"
        >
          {saving ? 'Adding…' : '+ Add League'}
        </button>
      </div>
      <Msg msg={msg} />

      {leagues.length > 0 && (
        <div className="mt-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Existing Leagues ({leagues.length})</p>
          <div className="flex flex-wrap gap-2">
            {leagues.map(l => (
              <span key={l.id} className="bg-gray-700 text-gray-200 text-xs px-3 py-1.5 rounded">
                {l.name} <span className="text-gray-500">#{l.id}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Division Panel ────────────────────────────────────────────────────────────

function DivisionPanel({ leagues, divisions, onRefresh }) {
  const [leagueID, setLeagueID] = useState('')
  const [name,     setName]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)

  const handleAdd = async () => {
    if (!leagueID) { setMsg({ type: 'err', text: 'Select a league.' }); return }
    if (!name.trim()) { setMsg({ type: 'err', text: 'Division name is required.' }); return }
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/division', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), leagueID: Number(leagueID) }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error || 'Failed to add division.' }); return }
      setMsg({ type: 'ok', text: `Division "${data.division.name}" added.` })
      setName('')
      onRefresh()
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const filteredDivisions = leagueID
    ? divisions.filter(d => d.leagueID === Number(leagueID))
    : divisions

  return (
    <>
      <div className="flex gap-2 items-end mb-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs uppercase tracking-wide font-semibold">League</label>
          <select
            value={leagueID}
            onChange={e => { setLeagueID(e.target.value); setMsg(null) }}
            className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Select league…</option>
            {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Division Name</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setMsg(null) }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. A Division"
            className="bg-gray-700 border border-gray-600 focus:border-blue-400 text-white rounded px-3 py-2 text-sm w-52 focus:outline-none transition"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition self-end"
        >
          {saving ? 'Adding…' : '+ Add Division'}
        </button>
      </div>
      <Msg msg={msg} />

      {filteredDivisions.length > 0 && (
        <div className="mt-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
            {leagueID ? `Divisions in ${leagues.find(l => l.id === Number(leagueID))?.name}` : 'All Divisions'} ({filteredDivisions.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredDivisions.map(d => (
              <span key={d.id} className="bg-gray-700 text-gray-200 text-xs px-3 py-1.5 rounded">
                {d.name} <span className="text-gray-500">#{d.id}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Season Panel ──────────────────────────────────────────────────────────────

function SeasonPanel({ leagues, seasons, onRefresh }) {
  const [leagueID, setLeagueID] = useState('')
  const [name,     setName]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)

  const handleAdd = async () => {
    if (!leagueID) { setMsg({ type: 'err', text: 'Select a league.' }); return }
    if (!name.trim()) { setMsg({ type: 'err', text: 'Season name is required.' }); return }
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), leagueID: Number(leagueID) }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error || 'Failed to add season.' }); return }
      setMsg({ type: 'ok', text: `Season "${data.season.name}" added.` })
      setName('')
      onRefresh()
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const filteredSeasons = leagueID
    ? seasons.filter(s => s.leagueID === Number(leagueID))
    : seasons

  return (
    <>
      <div className="flex gap-2 items-end mb-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs uppercase tracking-wide font-semibold">League</label>
          <select
            value={leagueID}
            onChange={e => { setLeagueID(e.target.value); setMsg(null) }}
            className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Select league…</option>
            {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Season Name</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setMsg(null) }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. 2025-2026"
            className="bg-gray-700 border border-gray-600 focus:border-blue-400 text-white rounded px-3 py-2 text-sm w-48 focus:outline-none transition"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded transition self-end"
        >
          {saving ? 'Adding…' : '+ Add Season'}
        </button>
      </div>
      <Msg msg={msg} />

      {filteredSeasons.length > 0 && (
        <div className="mt-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
            {leagueID ? `Seasons in ${leagues.find(l => l.id === Number(leagueID))?.name}` : 'All Seasons'} ({filteredSeasons.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredSeasons.map(s => (
              <span key={s.id} className="bg-gray-700 text-gray-200 text-xs px-3 py-1.5 rounded">
                {s.name} <span className="text-gray-500">#{s.id}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Player Panel ──────────────────────────────────────────────────────────────

const BLANK_FORM = {
  firstName: '', lastName: '', position: 'F',
  jerseyNumber: '', goals: '', assists: '', gamesPlayed: '', gaa: '',
}

function PlayerPanel() {
  const [players,     setPlayers]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [form,        setForm]        = useState(BLANK_FORM)
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState(null)
  const [editingID,   setEditingID]   = useState(null)
  const [editForm,    setEditForm]    = useState(null)
  const [editSaving,  setEditSaving]  = useState(false)
  const [editMsg,     setEditMsg]     = useState(null)
  const [deleteID,    setDeleteID]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [search,      setSearch]      = useState('')
  const [page,        setPage]        = useState(0)
  const PAGE_SIZE = 20

  // Fetches up to 500 players. Client-side search + pagination handle the rest.
  const loadPlayers = () => {
    setLoading(true)
    fetch('/api/getPlayers?limit=500')
      .then(r => r.json())
      .then(data => { setPlayers(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { loadPlayers() }, [])

  const handleAdd = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setMsg({ type: 'err', text: 'First and last name are required.' }); return
    }
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName:   form.firstName.trim(),
          lastName:    form.lastName.trim(),
          position:    form.position || null,
          jerseyNumber: form.jerseyNumber.trim() || null,
          goals:       form.goals       !== '' ? Number(form.goals)       : null,
          assists:     form.assists     !== '' ? Number(form.assists)     : null,
          gamesPlayed: form.gamesPlayed !== '' ? Number(form.gamesPlayed) : null,
          gaa:         form.gaa         !== '' ? Number(form.gaa)         : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error || 'Failed to add player.' }); return }
      setMsg({ type: 'ok', text: `${data.player.FirstName} ${data.player.LastName} added (ID ${data.player.PlayerID}).` })
      setForm(BLANK_FORM)
      loadPlayers()
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleEditStart = (p) => {
    setEditingID(p.PlayerID)
    setEditMsg(null)
    setEditForm({
      firstName:   p.FirstName   || '',
      lastName:    p.LastName    || '',
      position:    p.Position    || 'F',
      jerseyNumber: p.JerseyNumber?.toString() || '',
      goals:       p.Goals       != null ? String(p.Goals)       : '',
      assists:     p.Assists     != null ? String(p.Assists)     : '',
      gamesPlayed: p.GamesPlayed != null ? String(p.GamesPlayed) : '',
      gaa:         p.Gaa         != null ? String(p.Gaa)         : '',
    })
  }

  const handleEditSave = async () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setEditMsg({ type: 'err', text: 'First and last name are required.' }); return
    }
    setEditSaving(true); setEditMsg(null)
    try {
      const res = await fetch(`/api/player/${editingID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals:       editForm.goals       !== '' ? editForm.goals       : '',
          assists:     editForm.assists     !== '' ? editForm.assists     : '',
          gamesPlayed: editForm.gamesPlayed !== '' ? editForm.gamesPlayed : '',
          gaa:         editForm.gaa         !== '' ? editForm.gaa         : '',
          position:    editForm.position    || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setEditMsg({ type: 'err', text: data.error || 'Update failed.' }); return }
      setEditingID(null)
      setEditForm(null)
      loadPlayers()
    } catch (e) {
      setEditMsg({ type: 'err', text: e.message })
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/player/${deleteID}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error || 'Delete failed.' }); return }
      setDeleteID(null)
      loadPlayers()
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setDeleting(false)
    }
  }

  const filtered = players.filter(p => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return `${p.FirstName} ${p.LastName}`.toLowerCase().includes(q) || p.JerseyNumber?.toString().includes(q)
  })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const f = (val) => (e) => setForm(prev => ({ ...prev, [val]: e.target.value }))

  return (
    <>
      {/* Add player form */}
      <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
        <p className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-3">Add New Player</p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">First Name *</label>
            <input value={form.firstName} onChange={f('firstName')}
              placeholder="John"
              className="bg-gray-600 border border-gray-500 focus:border-blue-400 text-white rounded px-3 py-1.5 text-sm w-36 focus:outline-none transition" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">Last Name *</label>
            <input value={form.lastName} onChange={f('lastName')}
              placeholder="Smith"
              className="bg-gray-600 border border-gray-500 focus:border-blue-400 text-white rounded px-3 py-1.5 text-sm w-36 focus:outline-none transition" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">Position</label>
            <select value={form.position} onChange={f('position')}
              className="bg-gray-600 border border-gray-500 text-white rounded px-2 py-1.5 text-sm focus:outline-none">
              <option value="F">F</option>
              <option value="D">D</option>
              <option value="G">G</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">Jersey #</label>
            <input value={form.jerseyNumber} onChange={f('jerseyNumber')}
              placeholder="17"
              className="bg-gray-600 border border-gray-500 focus:border-blue-400 text-white rounded px-3 py-1.5 text-sm w-20 focus:outline-none transition" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">Goals</label>
            <input type="number" min={0} value={form.goals} onChange={f('goals')}
              placeholder="0"
              className="bg-gray-600 border border-gray-500 focus:border-blue-400 text-white rounded px-3 py-1.5 text-sm w-16 focus:outline-none transition" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">Assists</label>
            <input type="number" min={0} value={form.assists} onChange={f('assists')}
              placeholder="0"
              className="bg-gray-600 border border-gray-500 focus:border-blue-400 text-white rounded px-3 py-1.5 text-sm w-16 focus:outline-none transition" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">GP</label>
            <input type="number" min={0} value={form.gamesPlayed} onChange={f('gamesPlayed')}
              placeholder="0"
              className="bg-gray-600 border border-gray-500 focus:border-blue-400 text-white rounded px-3 py-1.5 text-sm w-16 focus:outline-none transition" />
          </div>
          {form.position === 'G' && (
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">GAA</label>
              <input type="number" min={0} step={0.01} value={form.gaa} onChange={f('gaa')}
                placeholder="0.00"
                className="bg-gray-600 border border-gray-500 focus:border-blue-400 text-white rounded px-3 py-1.5 text-sm w-20 focus:outline-none transition" />
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={saving}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded transition self-end"
          >
            {saving ? 'Adding…' : '+ Add Player'}
          </button>
        </div>
        <Msg msg={msg} />
      </div>

      {/* Player list */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search players…"
          className="bg-gray-700 border border-gray-600 focus:border-blue-400 text-white rounded px-3 py-1.5 text-sm w-56 focus:outline-none transition"
        />
        <span className="text-gray-500 text-xs">{filtered.length} player{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading players…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">No players found.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs border-b border-gray-700 bg-gray-700/40">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Pos</th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">G</th>
                  <th className="px-3 py-2">A</th>
                  <th className="px-3 py-2">GP</th>
                  <th className="px-3 py-2">GAA</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map(p => (
                  editingID === p.PlayerID ? (
                    <tr key={p.PlayerID} className="border-b border-gray-700 bg-yellow-900/20">
                      <td className="px-3 py-2 text-gray-500">{p.PlayerID}</td>
                      <td className="px-3 py-2 text-white" colSpan={2}>
                        {p.FirstName} {p.LastName}
                      </td>
                      <td className="px-3 py-2">
                        <select value={editForm.position} onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))}
                          className="bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-xs w-14">
                          <option value="F">F</option>
                          <option value="D">D</option>
                          <option value="G">G</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} value={editForm.goals} onChange={e => setEditForm(f => ({ ...f, goals: e.target.value }))}
                          className="bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-xs w-14 focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} value={editForm.assists} onChange={e => setEditForm(f => ({ ...f, assists: e.target.value }))}
                          className="bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-xs w-14 focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} value={editForm.gamesPlayed} onChange={e => setEditForm(f => ({ ...f, gamesPlayed: e.target.value }))}
                          className="bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-xs w-14 focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step={0.01} value={editForm.gaa} onChange={e => setEditForm(f => ({ ...f, gaa: e.target.value }))}
                          className="bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-xs w-16 focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={handleEditSave} disabled={editSaving}
                            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black text-xs px-2 py-1 rounded transition">
                            {editSaving ? '…' : 'Save'}
                          </button>
                          <button onClick={() => { setEditingID(null); setEditForm(null) }}
                            className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-2 py-1 rounded transition">
                            Cancel
                          </button>
                        </div>
                        <Msg msg={editMsg} />
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.PlayerID} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                      <td className="px-3 py-2 text-gray-500 text-xs">{p.PlayerID}</td>
                      <td className="px-3 py-2 text-white">{p.FirstName} {p.LastName}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${p.Position === 'G' ? 'bg-yellow-700 text-yellow-100' : p.Position === 'D' ? 'bg-blue-700 text-blue-100' : 'bg-gray-600 text-gray-200'}`}>
                          {p.Position || 'F'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{p.JerseyNumber ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-300">{p.Goals ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-300">{p.Assists ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-300">{p.GamesPlayed ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-300 text-xs">{p.Gaa != null ? Number(p.Gaa).toFixed(2) : '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => handleEditStart(p)}
                            className="text-gray-400 hover:text-yellow-400 text-xs px-2 py-1 rounded hover:bg-yellow-400/10 transition">
                            Edit
                          </button>
                          <button onClick={() => setDeleteID(p.PlayerID)}
                            className="text-gray-400 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-400/10 transition">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="text-gray-400 hover:text-white disabled:opacity-30 text-sm px-2 py-1 rounded hover:bg-gray-700 transition">
                ← Prev
              </button>
              <span className="text-gray-500 text-xs">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="text-gray-400 hover:text-white disabled:opacity-30 text-sm px-2 py-1 rounded hover:bg-gray-700 transition">
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteID !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-gray-800 rounded-lg p-6 w-80 shadow-xl border border-gray-700">
            <h3 className="text-white font-semibold mb-2">Delete Player</h3>
            <p className="text-gray-400 text-sm mb-1">
              Delete <span className="text-white font-medium">
                {players.find(p => p.PlayerID === deleteID)?.FirstName}{' '}
                {players.find(p => p.PlayerID === deleteID)?.LastName}
              </span>?
            </p>
            <p className="text-red-400 text-xs mb-5">This removes them from all team rosters.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded font-medium transition">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={() => setDeleteID(null)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-medium transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Delete Log Panel ─────────────────────────────────────────────────────────

const TYPE_COLORS = {
  ScheduledTeam: 'bg-red-900/60 text-red-300',
  Game:          'bg-orange-900/60 text-orange-300',
  Player:        'bg-yellow-900/60 text-yellow-300',
  Division:      'bg-purple-900/60 text-purple-300',
  League:        'bg-blue-900/60 text-blue-300',
  Season:        'bg-green-900/60 text-green-300',
}

function DeleteLogPanel() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState(null)

  const load = () => {
    setLoading(true); setErr(null)
    fetch('/api/delete-log', { headers: { [AUTH_HEADER_KEY]: getAuthToken() || '' } })
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false) })
      .catch(e  => { setErr(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>
  if (err)     return <p className="text-red-400 text-sm">Error: {err}</p>

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-xs">
          {entries.length === 0 ? 'No deletions recorded yet.' : `Showing ${entries.length} most recent deletions.`}
        </p>
        <button
          onClick={load}
          className="text-xs text-blue-400 hover:text-blue-300 transition px-2 py-1 rounded hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-gray-700">
                <th className="pb-2 pr-4 font-semibold">When</th>
                <th className="pb-2 pr-4 font-semibold">Type</th>
                <th className="pb-2 pr-4 font-semibold">ID</th>
                <th className="pb-2 pr-4 font-semibold">Name</th>
                <th className="pb-2 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                let meta = null
                try { meta = e.Metadata ? JSON.parse(e.Metadata) : null } catch { /* ignore */ }
                const badge = TYPE_COLORS[e.EntityType] || 'bg-gray-700 text-gray-300'
                return (
                  <tr key={e.LogID} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                    <td className="py-2 pr-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(e.DeletedAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${badge}`}>
                        {e.EntityType}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500 text-xs font-mono">{e.EntityID}</td>
                    <td className="py-2 pr-4 text-white text-xs">{e.EntityName || <span className="text-gray-600">—</span>}</td>
                    <td className="py-2 text-gray-500 text-xs font-mono">
                      {meta ? Object.entries(meta).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(', ') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ─── Main Settings page ────────────────────────────────────────────────────────

export default function Settings() {
  const [leagues,   setLeagues]   = useState([])
  const [divisions, setDivisions] = useState([])
  const [seasons,   setSeasons]   = useState([])

  // Single fetch pulls leagues, divisions, and seasons together so all three
  // panels stay in sync after any add operation.
  const loadAll = () => {
    fetch('/api/leagues-divisions')
      .then(r => r.json())
      .then(data => {
        setLeagues(data.leagues   || [])
        setDivisions(data.divisions || [])
        setSeasons(data.seasons   || [])
      })
      .catch(() => {})
  }

  useEffect(() => { loadAll() }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage leagues, divisions, seasons, and players in the database.</p>
      </div>

      <Section title="Leagues">
        <LeaguePanel leagues={leagues} onRefresh={loadAll} />
      </Section>

      <Section title="Divisions">
        <DivisionPanel leagues={leagues} divisions={divisions} onRefresh={loadAll} />
      </Section>

      <Section title="Seasons">
        <SeasonPanel leagues={leagues} seasons={seasons} onRefresh={loadAll} />
      </Section>

      <Section title="Players">
        <PlayerPanel />
      </Section>

      <Section title="Delete Log">
        <DeleteLogPanel />
      </Section>
    </div>
  )
}
