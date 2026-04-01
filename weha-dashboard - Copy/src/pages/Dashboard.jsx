import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Dashboard({ allTeams, onDeleteDivision, onUpdateTeams, onAddTeam }) {
  const [selectedDivision, setSelectedDivision] = useState('All')
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [divisionToDelete, setDivisionToDelete] = useState('')
  const [editingTeamKey, setEditingTeamKey] = useState(null)
  const [editState, setEditState] = useState(null)
  const [showEditConfirm, setShowEditConfirm] = useState(false)
  const [movingPlayerIndex, setMovingPlayerIndex] = useState(null)

  // Create team state
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [newTeam, setNewTeam] = useState({ teamName: '', players: [] })
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerExp, setNewPlayerExp] = useState(0)
  const [showCreateConfirm, setShowCreateConfirm] = useState(false)
  const [createErrors, setCreateErrors] = useState({})

  const divisions = Object.keys(allTeams)

  const teamList = selectedDivision === 'All'
    ? divisions.flatMap(div =>
        Object.entries(allTeams[div]).map(([key, team], i) => ({
          key: `${div}-${key}`,
          teamKey: key,
          team,
          division: div,
          index: i
        }))
      )
    : allTeams[selectedDivision]
      ? Object.entries(allTeams[selectedDivision]).map(([key, team], i) => ({
          key: `${selectedDivision}-${key}`,
          teamKey: key,
          team,
          division: selectedDivision,
          index: i
        }))
      : []

  const totalPlayers = teamList.reduce((acc, { team }) => acc + team.players.length, 0)

  const getSelectedTeamData = () => {
    if (!selectedTeam) return null
    return teamList.find(t => t.key === selectedTeam) || null
  }

  // --- Delete handlers ---
  const handleDeleteClick = () => {
    setDivisionToDelete(selectedDivision)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = () => {
    onDeleteDivision(divisionToDelete)
    setShowDeleteConfirm(false)
    setSelectedTeam(null)
    setEditingTeamKey(null)
    setEditState(null)
    if (selectedDivision === divisionToDelete) setSelectedDivision('All')
  }

  // --- Edit handlers ---
  const handleEditClick = (e, entry) => {
    e.stopPropagation()
    setSelectedTeam(null)
    setCreatingTeam(false)
    setNewTeam({ teamName: '', players: [] })
    setEditingTeamKey(entry.key)
    setMovingPlayerIndex(null)
    setEditState({
      teamName: entry.team.teamName || `Team ${entry.index + 1}`,
      players: entry.team.players.map(p => ({ ...p })),
      division: entry.division,
      teamKey: entry.teamKey,
      avg_experience: entry.team.avg_experience
    })
  }

  const handleCancelEdit = () => {
    setEditingTeamKey(null)
    setEditState(null)
    setMovingPlayerIndex(null)
  }

  const handlePlayerNameChange = (i, val) => {
    setEditState(prev => {
      const players = [...prev.players]
      players[i] = { ...players[i], name: val }
      return { ...prev, players }
    })
  }

  const handlePlayerExpChange = (i, val) => {
    setEditState(prev => {
      const players = [...prev.players]
      players[i] = { ...players[i], experience: parseInt(val) || 0 }
      return { ...prev, players }
    })
  }

  const handleRemovePlayer = (i) => {
    setEditState(prev => ({
      ...prev,
      players: prev.players.filter((_, idx) => idx !== i)
    }))
    if (movingPlayerIndex === i) setMovingPlayerIndex(null)
  }

  const handleMoveToTeam = (targetEntry) => {
    if (movingPlayerIndex === null) return
    const player = editState.players[movingPlayerIndex]
    const updatedPlayers = editState.players.filter((_, i) => i !== movingPlayerIndex)
    const updatedAvg = updatedPlayers.length > 0
      ? Math.round((updatedPlayers.reduce((s, p) => s + p.experience, 0) / updatedPlayers.length) * 100) / 100
      : 0
    const targetPlayers = [...targetEntry.team.players, player]
    const targetAvg = Math.round((targetPlayers.reduce((s, p) => s + p.experience, 0) / targetPlayers.length) * 100) / 100
    onUpdateTeams(editState.division, editState.teamKey, updatedPlayers, editState.teamName, updatedAvg)
    onUpdateTeams(targetEntry.division, targetEntry.teamKey, targetPlayers, targetEntry.team.teamName || `Team ${targetEntry.index + 1}`, targetAvg)
    setMovingPlayerIndex(null)
    setEditingTeamKey(null)
    setEditState(null)
  }

  const handleSaveEdit = () => {
    const avg = editState.players.length > 0
      ? Math.round((editState.players.reduce((s, p) => s + p.experience, 0) / editState.players.length) * 100) / 100
      : 0
    onUpdateTeams(editState.division, editState.teamKey, editState.players, editState.teamName, avg)
    setShowEditConfirm(false)
    setEditingTeamKey(null)
    setEditState(null)
    setMovingPlayerIndex(null)
  }

  // --- Create team handlers ---
  const handleStartCreate = () => {
    setCreatingTeam(true)
    setEditingTeamKey(null)
    setEditState(null)
    setSelectedTeam(null)
    setNewTeam({ teamName: '', players: [] })
    setNewPlayerName('')
    setNewPlayerExp(0)
    setCreateErrors({})
  }

  const handleCancelCreate = () => {
    setCreatingTeam(false)
    setNewTeam({ teamName: '', players: [] })
    setNewPlayerName('')
    setNewPlayerExp(0)
    setCreateErrors({})
  }

  const handleAddPlayerToNew = () => {
    if (!newPlayerName.trim()) {
      setCreateErrors(prev => ({ ...prev, player: 'Player name is required.' }))
      return
    }
    setNewTeam(prev => ({
      ...prev,
      players: [...prev.players, { name: newPlayerName.trim(), experience: parseInt(newPlayerExp) || 0 }]
    }))
    setNewPlayerName('')
    setNewPlayerExp(0)
    setCreateErrors(prev => ({ ...prev, player: null }))
  }

  const handleRemoveNewPlayer = (i) => {
    setNewTeam(prev => ({
      ...prev,
      players: prev.players.filter((_, idx) => idx !== i)
    }))
  }

  const handleCreateSubmit = () => {
    const errors = {}
    if (!newTeam.teamName.trim()) errors.teamName = 'Team name is required.'
    if (newTeam.players.length === 0) errors.players = 'Add at least one player.'
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors)
      return
    }
    setCreateErrors({})
    setShowCreateConfirm(true)
  }

  const handleCreateConfirm = () => {
    const avg = newTeam.players.length > 0
      ? Math.round((newTeam.players.reduce((s, p) => s + p.experience, 0) / newTeam.players.length) * 100) / 100
      : 0
    const teamKey = `team${Date.now()}`
    onAddTeam(selectedDivision, teamKey, {
      players: newTeam.players,
      teamName: newTeam.teamName.trim(),
      avg_experience: avg,
      size: newTeam.players.length
    })
    setShowCreateConfirm(false)
    setCreatingTeam(false)
    setNewTeam({ teamName: '', players: [] })
    setNewPlayerName('')
    setNewPlayerExp(0)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <div className="flex items-center gap-3">

          {/* Division dropdown — always visible */}
          <select
            value={selectedDivision}
            onChange={e => {
              setSelectedDivision(e.target.value)
              setSelectedTeam(null)
              handleCancelEdit()
              handleCancelCreate()
            }}
            className="p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm"
          >
            <option value="All">All Divisions</option>
            <option value="U10">U10</option>
            <option value="U12">U12</option>
            <option value="U14">U14</option>
            <option value="U16">U16</option>
            {/* Any extra divisions created dynamically */}
            {divisions
              .filter(d => !['U10', 'U12', 'U14', 'U16'].includes(d))
              .map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
          </select>

          {/* Create New Team — visible whenever a specific division is selected */}
          {selectedDivision !== 'All' && (
            <button
              onClick={handleStartCreate}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded transition"
            >
              + Create New Team
            </button>
          )}

          {/* Delete — only when selected division actually has teams */}
          {selectedDivision !== 'All' && divisions.includes(selectedDivision) && (
            <button
              onClick={handleDeleteClick}
              className="bg-red-700 hover:bg-red-800 text-white text-sm px-3 py-2 rounded transition"
            >
              Delete {selectedDivision} Teams
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded">
          <p className="text-gray-400 text-sm mb-1">Teams</p>
          <p className="text-2xl font-bold">{teamList.length || '—'}</p>
          {selectedDivision !== 'All' && <p className="text-gray-500 text-xs mt-1">{selectedDivision}</p>}
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <p className="text-gray-400 text-sm mb-1">Players</p>
          <p className="text-2xl font-bold">{totalPlayers || '—'}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <p className="text-gray-400 text-sm mb-1">Games</p>
          <p className="text-2xl font-bold">—</p>
        </div>
      </div>

      {/* Teams Section */}
      {teamList.length > 0 || creatingTeam ? (
        <div>
          {teamList.length > 0 && (
            <>
              <h2 className="text-xl font-semibold mb-4">Teams</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 mb-6">
                {teamList.map((entry, i) => {
                  const isEditing = editingTeamKey === entry.key
                  const isViewing = selectedTeam === entry.key && !editingTeamKey
                  return (
                    <div
                      key={entry.key}
                      className={`bg-gray-800 p-4 rounded-lg border-2 transition-all ${
                        isEditing ? 'border-yellow-400'
                        : isViewing ? 'border-red-500'
                        : 'border-transparent hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-white text-sm">
                          {entry.team.teamName || `Team ${i + 1}`}
                        </p>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => handleEditClick(e, entry)}
                            className={`p1 rounded transition text-sm ${
                              isEditing ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
                            }`}
                            title="Edit team"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              handleCancelEdit()
                              setSelectedTeam(selectedTeam === entry.key ? null : entry.key)
                            }}
                            className={`p-1 rounded transition text-sm ${
                              isViewing ? 'text-red-400 bg-red-400/10' : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
                            }`}
                            title="View team"
                          >
                            👁
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-red-400 mb-2">{entry.division}</p>
                      <p className="text-gray-400 text-sm">{entry.team.players.length} players</p>
                      <p className="text-gray-500 text-xs mt-1">Avg exp: {entry.team.avg_experience} yrs</p>
                      {isEditing && <p className="text-yellow-400 text-xs mt-2 font-medium">● Editing below</p>}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* View Panel */}
          {selectedTeam && !editingTeamKey && getSelectedTeamData() && (() => {
            const entry = getSelectedTeamData()
            return (
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {entry.team.teamName || `Team ${entry.index + 1}`}
                    </h3>
                    <p className="text-red-400 text-sm">{entry.division}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleEditClick(e, entry)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black text-sm px-3 py-1.5 rounded font-medium transition"
                    >
                      ✏️ Edit Team
                    </button>
                    <button onClick={() => setSelectedTeam(null)} className="text-gray-400 hover:text-white transition">✕</button>
                  </div>
                </div>
                <div className="flex gap-6 mb-4 text-sm">
                  <span className="text-gray-400">Players: <span className="text-white font-medium">{entry.team.players.length}</span></span>
                  <span className="text-gray-400">Avg Experience: <span className="text-white font-medium">{entry.team.avg_experience} yrs</span></span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2">Experience</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.team.players.map((player, i) => (
                      <tr key={i} className={`border-b border-gray-700/50 ${i % 2 === 0 ? '' : 'bg-gray-700/20'}`}>
                        <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                        <td className="py-2 pr-4 text-white">{player.name}</td>
                        <td className="py-2 text-gray-300">{player.experience} yrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {/* Edit Panel */}
          {editingTeamKey && editState && (
            <div className="bg-gray-900 border-2 border-yellow-400 rounded-lg overflow-hidden mb-4">
              <div className="bg-yellow-400 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-black font-bold text-sm">✏️ EDITING MODE</span>
                  <span className="text-black/70 text-sm">— {editState.division}</span>
                </div>
                <button onClick={handleCancelEdit} className="text-black hover:text-black/60 font-bold transition">✕ Cancel</button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-yellow-400 text-xs font-semibold uppercase tracking-wide mb-2">Team Name</label>
                  <input
                    value={editState.teamName}
                    onChange={e => setEditState(prev => ({ ...prev, teamName: e.target.value }))}
                    className="bg-gray-800 border border-yellow-400/50 focus:border-yellow-400 text-white rounded px-4 py-2 text-sm w-72 focus:outline-none transition"
                  />
                </div>
                <div className="flex gap-6 mb-6 text-sm">
                  <span className="text-gray-400">Players: <span className="text-white font-medium">{editState.players.length}</span></span>
                  <span className="text-gray-400">Avg Experience: <span className="text-white font-medium">
                    {editState.players.length > 0
                      ? Math.round((editState.players.reduce((s, p) => s + p.experience, 0) / editState.players.length) * 100) / 100
                      : 0} yrs
                  </span></span>
                </div>
                {movingPlayerIndex !== null && (
                  <div className="mb-4 p-3 bg-blue-900/50 border border-blue-500 rounded">
                    <p className="text-blue-300 text-sm mb-2">
                      Moving <strong className="text-white">{editState.players[movingPlayerIndex]?.name}</strong> — select destination:
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {teamList.filter(t => t.key !== editingTeamKey).map(t => (
                        <button
                          key={t.key}
                          onClick={() => handleMoveToTeam(t)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition"
                        >
                          {t.team.teamName || `Team ${t.index + 1}`} ({t.division})
                        </button>
                      ))}
                      <button onClick={() => setMovingPlayerIndex(null)} className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1.5 rounded transition">Cancel Move</button>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="pb-3 pr-4 font-medium">#</th>
                        <th className="pb-3 pr-4 font-medium">Player Name</th>
                        <th className="pb-3 pr-4 font-medium">Experience (yrs)</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editState.players.map((player, i) => (
                        <tr key={i} className={`border-b border-gray-700/50 ${movingPlayerIndex === i ? 'bg-blue-900/30' : i % 2 === 0 ? '' : 'bg-gray-800/50'}`}>
                          <td className="py-3 pr-4 text-gray-500">{i + 1}</td>
                          <td className="py-3 pr-4">
                            <input
                              value={player.name}
                              onChange={e => handlePlayerNameChange(i, e.target.value)}
                              className="bg-gray-800 border border-gray-600 focus:border-yellow-400 text-white rounded px-3 py-1.5 text-sm w-48 focus:outline-none transition"
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <input
                              type="number"
                              min={0}
                              value={player.experience}
                              onChange={e => handlePlayerExpChange(i, e.target.value)}
                              className="bg-gray-800 border border-gray-600 focus:border-yellow-400 text-white rounded px-3 py-1.5 text-sm w-24 focus:outline-none transition"
                            />
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setMovingPlayerIndex(movingPlayerIndex === i ? null : i)}
                                className={`text-xs px-3 py-1.5 rounded transition ${movingPlayerIndex === i ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white'}`}
                              >
                                Move
                              </button>
                              <button
                                onClick={() => handleRemovePlayer(i)}
                                className="text-xs bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white px-3 py-1.5 rounded transition"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button onClick={() => setShowEditConfirm(true)} className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-2.5 rounded transition">Save Changes</button>
                  <button onClick={handleCancelEdit} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded transition">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Create New Team Panel */}
          {creatingTeam && (
            <div className="bg-gray-900 border-2 border-green-400 rounded-lg overflow-hidden mb-4">
              <div className="bg-green-500 px-6 py-3 flex items-center justify-between">
                <span className="text-black font-bold text-sm">+ CREATE NEW TEAM — {selectedDivision}</span>
                <button onClick={handleCancelCreate} className="text-black hover:text-black/60 font-bold transition">✕ Cancel</button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-green-400 text-xs font-semibold uppercase tracking-wide mb-2">Team Name</label>
                  <input
                    value={newTeam.teamName}
                    onChange={e => {
                      setNewTeam(prev => ({ ...prev, teamName: e.target.value }))
                      setCreateErrors(prev => ({ ...prev, teamName: null }))
                    }}
                    placeholder="e.g. Red Hawks"
                    className={`bg-gray-800 border focus:border-green-400 text-white rounded px-4 py-2 text-sm w-72 focus:outline-none transition ${createErrors.teamName ? 'border-red-500' : 'border-gray-600'}`}
                  />
                  {createErrors.teamName && <p className="text-red-400 text-xs mt-1">{createErrors.teamName}</p>}
                </div>
                <div className="mb-4">
                  <label className="block text-green-400 text-xs font-semibold uppercase tracking-wide mb-2">Add Player</label>
                  <div className="flex gap-2 items-start flex-wrap">
                    <div className="flex flex-col gap-1">
                      <input
                        value={newPlayerName}
                        onChange={e => {
                          setNewPlayerName(e.target.value)
                          setCreateErrors(prev => ({ ...prev, player: null }))
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleAddPlayerToNew()}
                        placeholder="Player name"
                        className={`bg-gray-800 border focus:border-green-400 text-white rounded px-3 py-2 text-sm w-48 focus:outline-none transition ${createErrors.player ? 'border-red-500' : 'border-gray-600'}`}
                      />
                      {createErrors.player && <p className="text-red-400 text-xs">{createErrors.player}</p>}
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={newPlayerExp}
                      onChange={e => setNewPlayerExp(e.target.value)}
                      placeholder="Exp (yrs)"
                      className="bg-gray-800 border border-gray-600 focus:border-green-400 text-white rounded px-3 py-2 text-sm w-28 focus:outline-none transition"
                    />
                    <button
                      onClick={handleAddPlayerToNew}
                      className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded transition"
                    >
                      + Add
                    </button>
                  </div>
                </div>
                {newTeam.players.length > 0 ? (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
                        Players ({newTeam.players.length})
                      </label>
                      <span className="text-gray-500 text-xs">
                        Avg exp: {Math.round((newTeam.players.reduce((s, p) => s + p.experience, 0) / newTeam.players.length) * 100) / 100} yrs
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-700">
                          <th className="pb-2 pr-4">#</th>
                          <th className="pb-2 pr-4">Name</th>
                          <th className="pb-2 pr-4">Experience</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newTeam.players.map((p, i) => (
                          <tr key={i} className={`border-b border-gray-700/50 ${i % 2 === 0 ? '' : 'bg-gray-800/50'}`}>
                            <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                            <td className="py-2 pr-4 text-white">{p.name}</td>
                            <td className="py-2 pr-4 text-gray-300">{p.experience} yrs</td>
                            <td className="py-2">
                              <button
                                onClick={() => handleRemoveNewPlayer(i)}
                                className="text-xs bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white px-3 py-1 rounded transition"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {createErrors.players && <p className="text-red-400 text-xs mt-2">{createErrors.players}</p>}
                  </div>
                ) : (
                  <div className="mb-6 p-4 border border-dashed border-gray-600 rounded text-center text-gray-500 text-sm">
                    No players added yet — use the form above to add players.
                    {createErrors.players && <p className="text-red-400 text-xs mt-1">{createErrors.players}</p>}
                  </div>
                )}
                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button onClick={handleCreateSubmit} className="bg-green-500 hover:bg-green-600 text-black font-semibold px-8 py-2.5 rounded transition">Create Team</button>
                  <button onClick={handleCancelCreate} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded transition">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded-lg text-center text-gray-500">
          No teams yet.{' '}
          {selectedDivision !== 'All' ? (
            <span>
              Click <span className="text-green-400 cursor-pointer hover:underline" onClick={handleStartCreate}>+ Create New Team</span> to add one to {selectedDivision}, or go to{' '}
              <Link to="/upload" className="text-red-400 hover:underline">Upload</Link> to generate teams from a CSV.
            </span>
          ) : (
            <span>
              Select a division above to create a team, or go to{' '}
              <Link to="/upload" className="text-red-400 hover:underline">Upload</Link> to generate teams from a CSV.
            </span>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-80 shadow-xl border border-gray-700">
            <h2 className="text-white font-semibold text-lg mb-2">Delete Teams</h2>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete all teams for{' '}
              <span className="text-white font-medium">{divisionToDelete}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDeleteConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium transition">Delete</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-medium transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Save Edit Confirmation Modal */}
      {showEditConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-80 shadow-xl border border-gray-700">
            <h2 className="text-white font-semibold text-lg mb-2">Save Changes</h2>
            <p className="text-gray-400 text-sm mb-6">
              Save changes to <span className="text-white font-medium">{editState?.teamName}</span>? This will update the roster and recalculate average experience.
            </p>
            <div className="flex gap-3">
              <button onClick={handleSaveEdit} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-2 rounded font-medium transition">Save</button>
              <button onClick={() => setShowEditConfirm(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-medium transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Confirmation Modal */}
      {showCreateConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-80 shadow-xl border border-gray-700">
            <h2 className="text-white font-semibold text-lg mb-2">Create Team</h2>
            <p className="text-gray-400 text-sm mb-2">
              Create <span className="text-white font-medium">{newTeam.teamName}</span> in{' '}
              <span className="text-white font-medium">{selectedDivision}</span> with{' '}
              <span className="text-white font-medium">{newTeam.players.length} players</span>?
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreateConfirm} className="flex-1 bg-green-500 hover:bg-green-600 text-black py-2 rounded font-medium transition">Create</button>
              <button onClick={() => setShowCreateConfirm(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-medium transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}