// Dashboard — central admin view for reviewing and managing generated draft teams.
//
// Two types of teams live here side by side:
//   Draft teams   — held in the allTeams prop (in-memory + DraftTeam DB table).
//                   Freshly generated, not yet finalized. Admin can edit rosters,
//                   rename teams, move players between teams, assign unassigned
//                   teams to a real division, or delete them.
//   Scheduled teams — pulled from the ScheduledTeam DB table. These have been
//                   "committed" via the Save to DB button and are used by the
//                   Schedule Manager to generate games. Admins can rename,
//                   edit rosters, or delete them here (👥 button).
//
// Filter state: two dropdowns (league + division) control which subset of teams
// is visible. The division dropdown is built by merging three sources so it
// always shows all known divisions for the selected league:
//   1. Reference CSV divisions (from useLeagues)
//   2. Division names that appear in draft teams
//   3. Division names that appear in committed scheduled teams
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import useLeagues from '../hooks/useLeagues'
import { getAuthToken, AUTH_HEADER_KEY } from '../context/Authentication'

export default function Dashboard({ allTeams, teamsLoaded = true, onDeleteDivision, onDeleteTeam, onUpdateTeams, onAddTeam, onMoveTeam }) {
  const { leagues: csvLeagues, getDivisionsForLeague } = useLeagues()

  // DB-backed leagues (used for leagueID lookup when creating divisions)
  const [dbLeagues, setDbLeagues]     = useState([])
  const [dbDivisions, setDbDivisions] = useState([])
  const [dbSeasons, setDbSeasons]     = useState([])
  useEffect(() => {
    fetch('/api/leagues-divisions').then(r => r.json()).then(data => {
      setDbLeagues(data.leagues || [])
      setDbDivisions(data.divisions || [])
      setDbSeasons(data.seasons || [])
    }).catch(() => {})
  }, [])

  // ── Scheduled (committed) teams ─────────────────────────────────────────────
  // These are fetched from the ScheduledTeam table and shown in a separate
  // section. The admin can only rename or delete them here; roster editing
  // happens through the Schedule Manager.
  const [scheduledTeams,    setScheduledTeams]    = useState([])
  const [stEditingId,       setStEditingId]       = useState(null)
  const [stEditName,        setStEditName]        = useState('')
  const [stDeleteConfirmId, setStDeleteConfirmId] = useState(null)
  const [stSaving,          setStSaving]          = useState(false)
  const [stMsg,             setStMsg]             = useState(null)

  // Roster-edit modal for committed teams
  const [stRosterEditId,   setStRosterEditId]   = useState(null)
  const [stRosterEditName, setStRosterEditName] = useState('')
  const [stRosterPlayers,  setStRosterPlayers]  = useState([])
  const [stRosterSearch,   setStRosterSearch]   = useState('')
  const [stRosterResults,  setStRosterResults]  = useState([])
  const [stRosterSaving,   setStRosterSaving]   = useState(false)
  const [stRosterMsg,      setStRosterMsg]      = useState(null)

  const loadScheduledTeams = () => {
    fetch('/api/scheduled-teams')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setScheduledTeams(data) })
      .catch(() => {})
  }
  useEffect(() => { loadScheduledTeams() }, [])

  const handleStRenameStart = (team) => {
    setStEditingId(team.ScheduledTeamID)
    setStEditName(team.Name)
    setStMsg(null)
  }

  const handleStRenameSave = async () => {
    if (!stEditName.trim()) return
    setStSaving(true); setStMsg(null)
    try {
      const res = await fetch(`/api/scheduled-teams/${stEditingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: stEditName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setStMsg({ type: 'err', text: data.error || 'Rename failed.' }); return }
      setStEditingId(null)
      loadScheduledTeams()
    } catch (e) {
      setStMsg({ type: 'err', text: e.message })
    } finally {
      setStSaving(false)
    }
  }

  const handleStDelete = async (id) => {
    setStSaving(true); setStMsg(null)
    try {
      const res = await fetch(`/api/scheduled-teams/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setStMsg({ type: 'err', text: data.error || 'Delete failed.' }); return }
      setStDeleteConfirmId(null)
      loadScheduledTeams()
    } catch (e) {
      setStMsg({ type: 'err', text: e.message })
    } finally {
      setStSaving(false)
    }
  }

  const handleStRosterEditOpen = async (team) => {
    setStRosterMsg(null)
    setStRosterSearch('')
    setStRosterResults([])
    setStRosterEditName(team.Name)
    setStRosterEditId(team.ScheduledTeamID)
    try {
      const res = await fetch(`/api/scheduled-teams/${team.ScheduledTeamID}/players`)
      const players = await res.json()
      setStRosterPlayers(Array.isArray(players) ? players : [])
    } catch {
      setStRosterPlayers([])
    }
  }

  const handleStRosterSearch = async (q) => {
    setStRosterSearch(q)
    if (q.trim().length < 2) { setStRosterResults([]); return }
    try {
      const res = await fetch(`/api/players?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      setStRosterResults(Array.isArray(data) ? data : [])
    } catch {
      setStRosterResults([])
    }
  }

  const handleStRosterSave = async () => {
    if (!stRosterEditName.trim()) return
    setStRosterSaving(true); setStRosterMsg(null)
    try {
      const res = await fetch(`/api/scheduled-teams/${stRosterEditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stRosterEditName.trim(),
          playerIDs: stRosterPlayers.map(p => p.PlayerID),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setStRosterMsg({ type: 'err', text: data.error || 'Save failed.' }); return }
      setStRosterEditId(null)
      loadScheduledTeams()
    } catch (e) {
      setStRosterMsg({ type: 'err', text: e.message })
    } finally {
      setStRosterSaving(false)
    }
  }

  // ── Save to DB (draft → scheduled) ──────────────────────────────────────────
  // When the admin is happy with a set of draft teams, they pick a season and
  // click Save to DB. handleSaveToDB() auto-creates the league/division in the
  // DB if they don't exist yet, then writes ScheduledTeam records for each team.
  const [saveSeasonID,  setSaveSeasonID]  = useState('')
  const [savingToDB,    setSavingToDB]    = useState(false)
  const [saveMsg,       setSaveMsg]       = useState(null) // { type: 'ok'|'err', text }

  const handleSaveToDB = async () => {
    if (!saveSeasonID) { setSaveMsg({ type: 'err', text: 'Select a season first.' }); return }
    setSavingToDB(true); setSaveMsg(null)

    // Auto-create league/division in DB if they don't exist yet
    let leagueObj   = dbLeagues.find(l => l.name === selectedLeague)
    let divisionObj = dbDivisions.find(d => d.name === selectedDivision && d.leagueID === leagueObj?.id)

    if (!leagueObj) {
      try {
        const r = await fetch('/api/league', { method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() }, body: JSON.stringify({ name: selectedLeague }) })
        const d = await r.json()
        if (!r.ok && r.status !== 409) { setSavingToDB(false); setSaveMsg({ type: 'err', text: d.error || 'Could not create league.' }); return }
        leagueObj = r.status === 409 ? dbLeagues.find(l => l.name === selectedLeague) : d.league
        if (leagueObj) setDbLeagues(prev => prev.find(l => l.id === leagueObj.id) ? prev : [...prev, leagueObj])
      } catch (e) { setSavingToDB(false); setSaveMsg({ type: 'err', text: e.message }); return }
    }

    if (!divisionObj && leagueObj) {
      try {
        const r = await fetch('/api/division', { method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() }, body: JSON.stringify({ name: selectedDivision, leagueID: leagueObj.id }) })
        const d = await r.json()
        if (!r.ok && r.status !== 409) { setSavingToDB(false); setSaveMsg({ type: 'err', text: d.error || 'Could not create division.' }); return }
        divisionObj = r.status === 409
          ? dbDivisions.find(d2 => d2.name === selectedDivision && d2.leagueID === leagueObj.id)
          : d.division
        if (divisionObj) setDbDivisions(prev => prev.find(d2 => d2.id === divisionObj.id) ? prev : [...prev, divisionObj])
      } catch (e) { setSavingToDB(false); setSaveMsg({ type: 'err', text: e.message }); return }
    }

    if (!leagueObj || !divisionObj) {
      setSavingToDB(false)
      setSaveMsg({ type: 'err', text: 'Could not resolve league/division — please add them in Settings first.' })
      return
    }

    const divTeams = allTeams[selectedLeague]?.[selectedDivision] || {}
    const teams = Object.values(divTeams).map(t => ({ teamName: t.teamName || 'Team', players: t.players || [] }))
    try {
      const res = await fetch('/api/scheduled-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
        body: JSON.stringify({ leagueID: leagueObj.id, divisionID: divisionObj.id, seasonID: Number(saveSeasonID), teams }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveMsg({ type: 'err', text: data.error || 'Save failed.' }); return }
      setSaveMsg({ type: 'ok', text: `Saved ${data.savedTeams.length} teams — go to Schedule Manager to generate games.` })
      loadScheduledTeams()
      // Clear the draft version so only the scheduled copy remains visible
      if (selectedLeague !== 'All' && selectedDivision !== 'All') {
        onDeleteDivision(selectedLeague, selectedDivision)
      }
    } catch (e) {
      setSaveMsg({ type: 'err', text: e.message })
    } finally {
      setSavingToDB(false)
    }
  }

  // DB leagues are used for ID lookups when saving to DB; CSV leagues serve as
  // a fallback when the DB hasn't been seeded yet or the admin just loaded CSVs.
  const leagues = dbLeagues.length > 0 ? dbLeagues : csvLeagues

  // Player search
  const [playerSearch, setPlayerSearch] = useState('')
  const [searchOpen,   setSearchOpen]   = useState(false)
  const searchRef      = useRef(null)
  const viewPanelRef   = useRef(null)
  const editPanelRef   = useRef(null)
  const createPanelRef = useRef(null)
  useEffect(() => {
    if (!searchOpen) return
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [searchOpen])

  // Two-level filter state
  const [selectedLeague,   setSelectedLeague]   = useState('All')
  const [selectedDivision, setSelectedDivision] = useState('All')

  const [selectedTeam,         setSelectedTeam]         = useState(null)
  const [showDeleteConfirm,    setShowDeleteConfirm]    = useState(false)
  const [deleteTarget,         setDeleteTarget]         = useState({ league: '', division: '' })
  const [deleteTeamConfirm,    setDeleteTeamConfirm]    = useState(null) // single-team delete: { key, teamKey, league, division, teamName }
  const [editingTeamKey,    setEditingTeamKey]    = useState(null)
  const [editState,         setEditState]         = useState(null)
  const [editSaveMsg,       setEditSaveMsg]       = useState(null)
  const [movingPlayerIndex, setMovingPlayerIndex] = useState(null)
  const [addPlayerName,    setAddPlayerName]    = useState('')
  const [addPlayerPos,     setAddPlayerPos]     = useState('F')
  const [addPlayerSkill,   setAddPlayerSkill]   = useState('')
  const [addPlayerError,   setAddPlayerError]   = useState(null)
  const [creatingTeam,      setCreatingTeam]      = useState(false)
  const [newTeam,           setNewTeam]           = useState({ teamName: '', players: [] })
  const [newPlayerName,     setNewPlayerName]     = useState('')
  const [newPlayerExp,      setNewPlayerExp]      = useState(0)
  const [showCreateConfirm, setShowCreateConfirm] = useState(false)
  const [createErrors,      setCreateErrors]      = useState({})

  // Assign-to-division state (for teams in _unassigned)
  const [assigningTeam,    setAssigningTeam]    = useState(null) // { key, league, division, team }
  const [assignDest,       setAssignDest]       = useState('')
  const [newDivName,       setNewDivName]       = useState('')
  const [assignSaving,     setAssignSaving]     = useState(false)
  const [assignError,      setAssignError]      = useState(null)
  const [bulkAssignOpen,   setBulkAssignOpen]   = useState(false)

  useEffect(() => {
    if (selectedTeam && !editingTeamKey && viewPanelRef.current) {
      viewPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedTeam, editingTeamKey])

  useEffect(() => {
    if (editingTeamKey && editPanelRef.current) {
      editPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editingTeamKey])

  useEffect(() => {
    if (creatingTeam && createPanelRef.current) {
      createPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [creatingTeam])

  // Leagues that actually have teams
  const leaguesWithTeams = Object.keys(allTeams)

  // Divisions within selected league that have teams
  const divisionsWithTeams = selectedLeague !== 'All'
    ? Object.keys(allTeams[selectedLeague] || {})
    : []

  // All leagues — draft teams + committed teams (so newly-created leagues show up)
  const committedLeagueNames = [...new Set(scheduledTeams.map(t => t.LeagueName))]
  const allLeagueNames = [...new Set([...leaguesWithTeams, ...committedLeagueNames])]

  // All division names for selected league — merge reference CSVs with dynamic ones
  const selectedLeagueRef = leagues.find(l => l.name === selectedLeague)
  const refDivisionsForLeague = selectedLeagueRef
    ? getDivisionsForLeague(selectedLeagueRef.id).map(d => d.name)
    : []
  const committedDivisionsForLeague = selectedLeague !== 'All'
    ? [...new Set(scheduledTeams.filter(t => t.LeagueName === selectedLeague).map(t => t.DivisionName))]
    : []
  const allDivisionNames = [
    ...refDivisionsForLeague,
    ...divisionsWithTeams.filter(d => !refDivisionsForLeague.includes(d)),
    ...committedDivisionsForLeague.filter(d => !refDivisionsForLeague.includes(d) && !divisionsWithTeams.includes(d)),
  ]

  // Flattens the nested allTeams map into an array of enriched objects so the
  // render loop doesn't need to care about league/division nesting. Each entry
  // carries enough context (league, division, teamKey) for any mutation handler.
  const buildTeamList = () => {
    const list = []
    const leagueKeys = selectedLeague === 'All' ? leaguesWithTeams : [selectedLeague]

    for (const league of leagueKeys) {
      const divKeys = selectedDivision === 'All'
        ? Object.keys(allTeams[league] || {})
        : [selectedDivision]

      for (const div of divKeys) {
        const teams = allTeams[league]?.[div] || {}
        Object.entries(teams).forEach(([key, team], i) => {
          list.push({
            key:      `${league}-${div}-${key}`,
            teamKey:  key,
            team,
            league,
            division: div,
            index:    i,
          })
        })
      }
    }
    return list
  }

  const teamList     = buildTeamList()
  const totalPlayers = teamList.reduce((acc, { team }) => acc + (team.players?.length || 0), 0)

  const filteredScheduledTeams = scheduledTeams.filter(t => {
    if (selectedLeague !== 'All' && t.LeagueName !== selectedLeague) return false
    if (selectedDivision !== 'All' && t.DivisionName !== selectedDivision) return false
    if (saveSeasonID && String(t.SeasonID) !== String(saveSeasonID)) return false
    return true
  })

  // Draft teams whose league+division already has committed scheduled teams are
  // hidden — the committed version is shown instead. _unassigned slots are kept
  // visible because they haven't been promoted yet.
  const scheduledDivKeys = new Set(scheduledTeams.map(t => `${t.LeagueName}||${t.DivisionName}`))
  const displayTeamList = teamList.filter(e =>
    e.division.startsWith('_unassigned') || !scheduledDivKeys.has(`${e.league}||${e.division}`)
  )

  const getSelectedTeamData = () =>
    selectedTeam ? teamList.find(t => t.key === selectedTeam) || null : null

  // --- Delete all (draft) ---
  const handleDeleteClick = () => {
    const division = (selectedDivision !== 'All') ? selectedDivision : null
    setDeleteTarget({ league: selectedLeague, division })
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget.division) {
      onDeleteDivision(deleteTarget.league, deleteTarget.division)
    } else {
      // No division filter — delete every division in this league
      const divKeys = Object.keys(allTeams[deleteTarget.league] || {})
      divKeys.forEach(div => onDeleteDivision(deleteTarget.league, div))
    }
    setShowDeleteConfirm(false)
    setSelectedTeam(null)
    setEditingTeamKey(null)
    setEditState(null)
    setSelectedDivision('All')
  }

  // --- Delete single draft team ---
  const handleDeleteTeamClick = (e, entry) => {
    e.stopPropagation()
    setDeleteTeamConfirm({ key: entry.key, teamKey: entry.teamKey, league: entry.league, division: entry.division, teamName: entry.team.teamName || `Team ${entry.index + 1}` })
  }

  const handleDeleteTeamConfirm = () => {
    if (!deleteTeamConfirm) return
    onDeleteTeam(deleteTeamConfirm.league, deleteTeamConfirm.division, deleteTeamConfirm.teamKey)
    if (selectedTeam === deleteTeamConfirm.key) setSelectedTeam(null)
    if (editingTeamKey === deleteTeamConfirm.key) { setEditingTeamKey(null); setEditState(null) }
    setDeleteTeamConfirm(null)
  }

  // --- Edit ---
  const handleEditClick = (e, entry) => {
    e.stopPropagation()
    setSelectedTeam(null)
    setCreatingTeam(false)
    setNewTeam({ teamName: '', players: [] })
    setEditingTeamKey(entry.key)
    setMovingPlayerIndex(null)
    setEditState({
      teamName: entry.team.teamName || `Team ${entry.index + 1}`,
      players:  (entry.team.players || []).map(p => ({ ...p })),
      league:   entry.league,
      division: entry.division,
      teamKey:  entry.teamKey,
    })
  }

  const handleCancelEdit = () => {
    setEditingTeamKey(null)
    setEditState(null)
    setMovingPlayerIndex(null)
    setEditSaveMsg(null)
    setAddPlayerName(''); setAddPlayerPos('F'); setAddPlayerSkill(''); setAddPlayerError(null)
  }

  const handleAddPlayerToEdit = () => {
    if (!addPlayerName.trim()) { setAddPlayerError('Name is required.'); return }
    const isGoalie = addPlayerPos === 'G'
    const skill = parseFloat(addPlayerSkill) || 0
    setEditState(prev => ({
      ...prev,
      players: [...prev.players, {
        name:     addPlayerName.trim(),
        position: addPlayerPos,
        isGoalie,
        skill,
        experience: skill,
        goals:   0,
        assists: 0,
      }]
    }))
    setAddPlayerName(''); setAddPlayerPos('F'); setAddPlayerSkill(''); setAddPlayerError(null)
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
      players[i] = { ...players[i], experience: parseFloat(val) || 0 }
      return { ...prev, players }
    })
  }

  const handlePlayerPositionChange = (i, val) => {
    setEditState(prev => {
      const players = [...prev.players]
      players[i] = { ...players[i], position: val, isGoalie: val === 'G' }
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
    const updatedAvg = calcAvg(updatedPlayers)
    const targetPlayers = [...(targetEntry.team.players || []), player]
    const targetAvg = calcAvg(targetPlayers)
    onUpdateTeams(editState.league, editState.division, editState.teamKey, updatedPlayers, editState.teamName, updatedAvg)
    onUpdateTeams(targetEntry.league, targetEntry.division, targetEntry.teamKey, targetPlayers, targetEntry.team.teamName || `Team ${targetEntry.index + 1}`, targetAvg)
    setMovingPlayerIndex(null)
    setEditingTeamKey(null)
    setEditState(null)
  }

  const handleSaveEdit = () => {
    const avg = calcAvg(editState.players)
    onUpdateTeams(editState.league, editState.division, editState.teamKey, editState.players, editState.teamName, avg)
    setEditSaveMsg({ type: 'ok', text: 'Saved!' })
    setTimeout(() => {
      setEditSaveMsg(null)
      setEditingTeamKey(null)
      setEditState(null)
      setMovingPlayerIndex(null)
    }, 900)
  }

  const calcAvg = (players) => {
    if (!players || players.length === 0) return 0
    const fieldPlayers = players.filter(p => !p.isGoalie)
    const pool = fieldPlayers.length > 0 ? fieldPlayers : players
    const key = pool[0]?.skill !== undefined ? 'skill' : 'experience'
    return Math.round((pool.reduce((s, p) => s + (p[key] || 0), 0) / pool.length) * 100) / 100
  }

  // --- Create team ---
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
      players: [...prev.players, { name: newPlayerName.trim(), experience: parseFloat(newPlayerExp) || 0, skill: parseFloat(newPlayerExp) || 0 }]
    }))
    setNewPlayerName('')
    setNewPlayerExp(0)
    setCreateErrors(prev => ({ ...prev, player: null }))
  }

  const handleRemoveNewPlayer = (i) => {
    setNewTeam(prev => ({ ...prev, players: prev.players.filter((_, idx) => idx !== i) }))
  }

  const handleCreateSubmit = () => {
    const errors = {}
    if (!newTeam.teamName.trim()) errors.teamName = 'Team name is required.'
    if (newTeam.players.length === 0) errors.players = 'Add at least one player.'
    if (Object.keys(errors).length > 0) { setCreateErrors(errors); return }
    setCreateErrors({})
    setShowCreateConfirm(true)
  }

  const handleCreateConfirm = () => {
    const avg = calcAvg(newTeam.players)
    const teamKey = `team${Date.now()}`
    onAddTeam(selectedLeague, selectedDivision, teamKey, {
      players:        newTeam.players,
      teamName:       newTeam.teamName.trim(),
      avg_experience: avg,
      avg_skill:      avg,
      size:           newTeam.players.length,
    })
    setShowCreateConfirm(false)
    setCreatingTeam(false)
    setNewTeam({ teamName: '', players: [] })
    setNewPlayerName('')
    setNewPlayerExp(0)
  }

  // ── Assign team to division ───────────────────────────────────────────────
  const handleAssignToDivision = async () => {
    if (!assigningTeam) return
    setAssignSaving(true); setAssignError(null)

    let destDivName = assignDest
    if (assignDest === '__new__') {
      if (!newDivName.trim()) { setAssignError('Division name is required.'); setAssignSaving(false); return }
      // Create the division in the DB
      try {
        const leagueRef = leagues.find(l => l.name === assigningTeam.league)
        const res = await fetch('/api/division', {
          method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
          body: JSON.stringify({ name: newDivName.trim(), leagueID: leagueRef?.id }),
        })
        const data = await res.json()
        if (!res.ok) { setAssignError(data.error || 'Failed to create division.'); setAssignSaving(false); return }
        destDivName = data.division.name
      } catch { setAssignError('Could not connect to server.'); setAssignSaving(false); return }
    }

    if (!destDivName) { setAssignError('Select a division.'); setAssignSaving(false); return }

    onMoveTeam(assigningTeam.league, assigningTeam.division, destDivName, assigningTeam.teamKey, assigningTeam.team)
    setAssigningTeam(null); setAssignDest(''); setNewDivName(''); setAssignSaving(false)
  }

  // ── Bulk assign all unassigned teams in selected league to one division ───
  const handleBulkAssignToDivision = async () => {
    setAssignSaving(true); setAssignError(null)

    let destDivName = assignDest
    if (assignDest === '__new__') {
      if (!newDivName.trim()) { setAssignError('Division name is required.'); setAssignSaving(false); return }
      try {
        const leagueRef = leagues.find(l => l.name === selectedLeague)
        const res = await fetch('/api/division', {
          method: 'POST', headers: { 'Content-Type': 'application/json', [AUTH_HEADER_KEY]: getAuthToken() },
          body: JSON.stringify({ name: newDivName.trim(), leagueID: leagueRef?.id }),
        })
        const data = await res.json()
        if (!res.ok) { setAssignError(data.error || 'Failed to create division.'); setAssignSaving(false); return }
        destDivName = data.division.name
      } catch { setAssignError('Could not connect to server.'); setAssignSaving(false); return }
    }

    if (!destDivName) { setAssignError('Select a division.'); setAssignSaving(false); return }

    unassignedTeams.forEach(({ divKey, teamKey, team }) => {
      onMoveTeam(selectedLeague, divKey, destDivName, teamKey, team)
    })
    setBulkAssignOpen(false); setAssignDest(''); setNewDivName(''); setAssignSaving(false)
  }

  const leagueObj = dbLeagues.find(l => l.name === selectedLeague)
  const seasonsForLeague = (() => {
    const seen = new Map()
    for (const s of dbSeasons) {
      if (s.leagueID !== leagueObj?.id) continue
      const key = s.name.toLowerCase()
      if (!seen.has(key)) seen.set(key, s)
    }
    return [...seen.values()]
  })()

  // All unassigned teams for the currently selected league
  const unassignedTeams = selectedLeague !== 'All'
    ? Object.entries(allTeams[selectedLeague] || {})
        .filter(([divKey]) => divKey.startsWith('_unassigned'))
        .flatMap(([divKey, teams]) =>
          Object.entries(teams).map(([teamKey, team]) => ({ divKey, teamKey, team }))
        )
    : []
  const hasUnassigned = unassignedTeams.length > 0

  const canCreateTeam = selectedLeague !== 'All' && selectedDivision !== 'All'

  // "Delete all" requires league + division, except when no divisions exist for the league
  // in which case just the league is enough.
  const leagueHasDivisions = allDivisionNames.length > 0
  const canDeleteAll = selectedLeague !== 'All' && (selectedDivision !== 'All' || !leagueHasDivisions)
  // Show the button whenever a league is selected; disable it with a tooltip when incomplete
  const showDeleteAllBtn = selectedLeague !== 'All'
  const deleteAllDisabled = !canDeleteAll

  // Legacy: used for "Save to Schedule Manager" conditional
  const canDelete = selectedLeague !== 'All' && selectedDivision !== 'All'
    && leaguesWithTeams.includes(selectedLeague)
    && Object.keys(allTeams[selectedLeague] || {}).includes(selectedDivision)

  // Flatten all players across all leagues/divisions for search
  const playerSearchResults = (() => {
    const q = playerSearch.trim().toLowerCase()
    if (!q) return []
    const results = []
    for (const [league, divisions] of Object.entries(allTeams)) {
      for (const [division, teams] of Object.entries(divisions)) {
        for (const [teamKey, team] of Object.entries(teams)) {
          for (const player of (team.players || [])) {
            if (player.name?.toLowerCase().includes(q)) {
              results.push({
                player,
                teamName:     team.teamName || teamKey,
                teamEntryKey: `${league}-${division}-${teamKey}`,
                league,
                division,
              })
            }
          }
        }
      }
    }
    return results.slice(0, 20)
  })()

  const handleSearchSelect = (result) => {
    setPlayerSearch('')
    setSearchOpen(false)
    setSelectedLeague(result.league)
    setSelectedDivision(result.division)
    setSelectedTeam(result.teamEntryKey)
    handleCancelEdit()
    handleCancelCreate()
  }

  return (
    <div>
      {/* Player Search */}
      <div className="mb-5 relative" ref={searchRef}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search players by name…"
            value={playerSearch}
            onChange={e => { setPlayerSearch(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            className="w-full pl-9 pr-9 py-2.5 bg-gray-800 border border-gray-600 focus:border-blue-500 text-white rounded-lg text-sm focus:outline-none transition placeholder-gray-500"
          />
          {playerSearch && (
            <button
              onClick={() => { setPlayerSearch(''); setSearchOpen(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition text-lg leading-none"
            >✕</button>
          )}
        </div>

        {searchOpen && playerSearch.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
            {playerSearchResults.length === 0 ? (
              <p className="px-4 py-3 text-gray-500 text-sm">No players found for &ldquo;{playerSearch}&rdquo;</p>
            ) : (
              <>
                <div className="px-4 py-2 border-b border-gray-700">
                  <span className="text-gray-500 text-xs">{playerSearchResults.length} result{playerSearchResults.length !== 1 ? 's' : ''}{playerSearchResults.length === 20 ? ' (showing top 20)' : ''}</span>
                </div>
                <ul className="divide-y divide-gray-700/50">
                  {playerSearchResults.map((result, i) => {
                    const p = result.player
                    const isG = p.isGoalie || p.position === 'G'
                    const divDisplay = result.division.startsWith('_unassigned') ? '(No division)' : result.division
                    return (
                      <li key={i}>
                        <button
                          onClick={() => handleSearchSelect(result)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-700/60 transition flex items-center gap-3"
                        >
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${isG ? 'bg-yellow-600 text-yellow-100' : p.position === 'D' ? 'bg-blue-700 text-blue-100' : 'bg-gray-600 text-gray-200'}`}>
                            {isG ? 'G' : (p.position || 'F')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{p.name}</p>
                            <p className="text-gray-400 text-xs truncate">
                              <span className="text-red-400">{result.teamName}</span>
                              <span className="text-gray-500"> · {result.league} — {divDisplay}</span>
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            {isG
                              ? <p className="text-gray-300 text-xs">GAA {p.gaa != null ? Number(p.gaa).toFixed(2) : '—'}</p>
                              : <p className="text-gray-300 text-xs">{p.goals ?? 0}G {p.assists ?? 0}A{p.gamesPlayed ? ` · ${p.gamesPlayed}GP` : ''}</p>
                            }
                            <p className="text-gray-500 text-xs">skill {p.skill?.toFixed(3) ?? '—'}</p>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>

        <div className="flex items-center gap-3 flex-wrap">

          {/* League filter — always shows all leagues from reference CSVs */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs">League</label>
            <select
              value={selectedLeague}
              onChange={e => {
                setSelectedLeague(e.target.value)
                setSelectedDivision('All')
                setSelectedTeam(null)
                handleCancelEdit()
                handleCancelCreate()
              }}
              className="p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm"
            >
              <option value="All">All Leagues</option>
              {allLeagueNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Division filter — shows all divisions for selected league from reference CSVs */}
          {selectedLeague !== 'All' && (
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 text-xs">Division</label>
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
                {allDivisionNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Season filter — shown when a league with seasons is selected */}
          {selectedLeague !== 'All' && seasonsForLeague.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 text-xs">Season</label>
              <select
                value={saveSeasonID}
                onChange={e => { setSaveSeasonID(e.target.value); setSaveMsg(null) }}
                className="p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm"
              >
                <option value="">All Seasons</option>
                {seasonsForLeague.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Bulk assign — shown when the selected league has teams with no division */}
          {hasUnassigned && (
            <button
              onClick={() => { setBulkAssignOpen(true); setAssignDest(''); setNewDivName(''); setAssignError(null) }}
              className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm px-3 py-2 rounded transition self-end"
            >
              Assign All ({unassignedTeams.length}) to Division
            </button>
          )}

          {/* Create team — only when both league and division selected */}
          {canCreateTeam && (
            <button
              onClick={handleStartCreate}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded transition self-end"
            >
              + Create New Team
            </button>
          )}

          {/* Delete All — shown whenever a league is selected; disabled until requirements met */}
          {showDeleteAllBtn && (
            <div className="flex flex-col gap-1 self-end">
              <button
                onClick={handleDeleteClick}
                disabled={deleteAllDisabled}
                title={deleteAllDisabled ? 'Select a division first' : undefined}
                className="bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm px-3 py-2 rounded transition"
              >
                Delete {selectedDivision !== 'All' ? `${selectedDivision} ` : ''}Teams
              </button>
              {deleteAllDisabled && (
                <p className="text-gray-500 text-xs">Select a division to delete</p>
              )}
            </div>
          )}

          {/* Save to DB — only when division has generated teams */}
          {canDelete && (
            <div className="flex flex-col gap-1 self-end">
              <button
                onClick={handleSaveToDB}
                disabled={savingToDB}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-3 py-2 rounded transition"
              >
                {savingToDB ? 'Saving…' : 'Save to Schedule Manager'}
              </button>
              {saveMsg && (
                <p className={`text-xs ${saveMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                  {saveMsg.text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded">
          <p className="text-gray-400 text-sm mb-1">Teams</p>
          <p className="text-2xl font-bold">{teamList.length || '—'}</p>
          {selectedLeague !== 'All' && <p className="text-gray-500 text-xs mt-1">{selectedLeague}</p>}
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
      {displayTeamList.length > 0 || filteredScheduledTeams.length > 0 || creatingTeam ? (
        <div>
          {(displayTeamList.length > 0 || filteredScheduledTeams.length > 0) && (
            <>
              <h2 className="text-xl font-semibold mb-4">Teams</h2>
              {stMsg && (
                <p className={`text-sm mb-3 ${stMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{stMsg.text}</p>
              )}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 mb-6">
                {displayTeamList.map((entry, i) => {
                  const isEditing = editingTeamKey === entry.key
                  const isViewing = selectedTeam === entry.key && !editingTeamKey
                  const skillDisplay = entry.team.avg_skill ?? entry.team.avg_experience ?? 0
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
                        <p className="font-semibold text-white text-sm truncate">
                          {entry.team.teamName || `Team ${i + 1}`}
                        </p>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={e => handleEditClick(e, entry)}
                            className={`p-1 rounded transition text-sm ${isEditing ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'}`}
                            title="Edit team"
                          >✏️</button>
                          <button
                            onClick={() => { handleCancelEdit(); setSelectedTeam(selectedTeam === entry.key ? null : entry.key) }}
                            className={`p-1 rounded transition text-sm ${isViewing ? 'text-red-400 bg-red-400/10' : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'}`}
                            title="View team"
                          >👁</button>
                          <button
                            onClick={e => handleDeleteTeamClick(e, entry)}
                            className="p-1 rounded transition text-sm text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                            title="Delete team"
                          >🗑</button>
                        </div>
                      </div>
                      <p className="text-xs text-red-400 mb-1">{entry.league}</p>
                      <p className="text-xs text-gray-500 mb-2">{entry.division.startsWith('_unassigned') ? <span className="text-yellow-500">⚠ No division</span> : entry.division}</p>
                      <p className="text-gray-400 text-sm">{entry.team.players?.length || 0} players</p>
                      {entry.team.hasGoalie !== undefined && (
                        <p className={`text-xs mt-1 ${entry.team.hasGoalie ? 'text-green-400' : 'text-red-400'}`}>
                          {entry.team.hasGoalie ? '✓ Goalie assigned' : '⚠ No goalie'}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">Avg skill: {skillDisplay}</p>
                      {entry.division.startsWith('_unassigned') && (
                        <button
                          onClick={e => { e.stopPropagation(); setAssigningTeam(entry); setAssignDest(''); setNewDivName(''); setAssignError(null) }}
                          className="mt-2 w-full text-xs bg-yellow-600 hover:bg-yellow-500 text-white py-1 rounded transition"
                        >
                          Assign Division
                        </button>
                      )}
                      {isEditing && <p className="text-yellow-400 text-xs mt-2 font-medium">● Editing below</p>}
                    </div>
                  )
                })}

                {/* Committed (scheduled) team cards — inline with draft teams */}
                {filteredScheduledTeams.map(team => (
                  <div key={`committed-${team.ScheduledTeamID}`} className="bg-gray-800 p-4 rounded-lg border-2 border-green-700 transition-all">
                    {stEditingId === team.ScheduledTeamID ? (
                      <div className="flex flex-col gap-2">
                        <input
                          value={stEditName}
                          onChange={e => setStEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleStRenameSave(); if (e.key === 'Escape') setStEditingId(null) }}
                          autoFocus
                          className="bg-gray-700 border border-yellow-400 text-white rounded px-2 py-1 text-sm focus:outline-none"
                        />
                        <div className="flex gap-1">
                          <button onClick={handleStRenameSave} disabled={stSaving} className="flex-1 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black text-xs font-semibold py-1 rounded transition">Save</button>
                          <button onClick={() => setStEditingId(null)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white text-xs py-1 rounded transition">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-white text-sm truncate">{team.Name}</p>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleStRosterEditOpen(team)} className="p-1 text-gray-400 hover:text-yellow-400 rounded text-xs transition" title="Edit team name & roster">✏️</button>
                            <button onClick={() => { setStDeleteConfirmId(team.ScheduledTeamID); setStMsg(null) }} className="p-1 text-gray-400 hover:text-red-400 rounded text-xs transition" title="Delete">🗑</button>
                          </div>
                        </div>
                        <p className="text-xs text-red-400 mb-1">{team.LeagueName}</p>
                        <p className="text-xs text-gray-500 mb-2">{team.DivisionName}</p>
                        <p className="text-gray-400 text-sm">{team.playerCount} players</p>
                        {team.SeasonName && <p className="text-gray-500 text-xs mt-0.5">{team.SeasonName}</p>}
                        {team.hasGames ? (
                          <p className="text-green-400 text-xs mt-1 font-medium">● Schedule Created</p>
                        ) : (
                          <p className="text-gray-500 text-xs mt-1">Committed · No games yet</p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* View Panel */}
          {selectedTeam && !editingTeamKey && getSelectedTeamData() && (() => {
            const entry = getSelectedTeamData()
            const skillDisplay = entry.team.avg_skill ?? entry.team.avg_experience ?? 0
            return (
              <div ref={viewPanelRef} className="bg-gray-800 p-6 rounded-lg border border-gray-600 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{entry.team.teamName || `Team ${entry.index + 1}`}</h3>
                    <p className="text-red-400 text-sm">{entry.league}</p>
                    <p className="text-gray-500 text-xs">{entry.division}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={e => handleEditClick(e, entry)} className="bg-yellow-500 hover:bg-yellow-600 text-black text-sm px-3 py-1.5 rounded font-medium transition">✏️ Edit</button>
                    <button onClick={() => setSelectedTeam(null)} className="text-gray-400 hover:text-white transition">✕</button>
                  </div>
                </div>
                <div className="flex gap-6 mb-4 text-sm flex-wrap">
                  <span className="text-gray-400">Players: <span className="text-white font-medium">{entry.team.players?.length || 0}</span></span>
                  <span className="text-gray-400">Avg Skill: <span className="text-white font-medium">{skillDisplay}</span></span>
                  {entry.team.hasGoalie !== undefined && (
                    <span className={entry.team.hasGoalie ? 'text-green-400' : 'text-red-400'}>
                      {entry.team.hasGoalie ? '✓ Goalie assigned' : '⚠ No goalie'}
                    </span>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Position</th>
                      <th className="pb-2">Skill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(entry.team.players || []).map((player, i) => (
                      <tr key={i} className={`border-b border-gray-700/50 ${i % 2 === 0 ? '' : 'bg-gray-700/20'}`}>
                        <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                        <td className="py-2 pr-4 text-white">{player.name}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded ${player.isGoalie || player.position === 'G' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                            {player.isGoalie || player.position === 'G' ? 'G' : (player.position || 'F')}
                          </span>
                        </td>
                        <td className="py-2 text-gray-300">{player.skill ?? player.experience ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {/* Edit Panel */}
          {editingTeamKey && editState && (
            <div ref={editPanelRef} className="bg-gray-900 border-2 border-yellow-400 rounded-lg overflow-hidden mb-4">
              <div className="bg-yellow-400 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-black font-bold text-sm">✏️ EDITING: {editState.teamName}</span>
                  <span className="text-black/60 text-xs">{editState.league} / {editState.division}</span>
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
                <div className="flex gap-6 mb-4 text-sm">
                  <span className="text-gray-400">Players: <span className="text-white font-medium">{editState.players.length}</span></span>
                  <span className="text-gray-400">Avg Skill: <span className="text-white font-medium">{calcAvg(editState.players)}</span></span>
                </div>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="pb-3 pr-3 w-8">#</th>
                        <th className="pb-3 pr-3">Name</th>
                        <th className="pb-3 pr-3">Pos</th>
                        <th className="pb-3 pr-3">Skill</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editState.players.map((player, i) => (
                        <tr key={i} className={`border-b border-gray-700/50 ${movingPlayerIndex === i ? 'bg-blue-900/20 ring-1 ring-inset ring-blue-600' : i % 2 === 0 ? '' : 'bg-gray-800/40'}`}>
                          <td className="py-2.5 pr-3 text-gray-500 text-xs">{i + 1}</td>
                          <td className="py-2.5 pr-3">
                            <input
                              value={player.name}
                              onChange={e => handlePlayerNameChange(i, e.target.value)}
                              className="bg-gray-800 border border-gray-600 focus:border-yellow-400 text-white rounded px-3 py-1.5 text-sm w-40 focus:outline-none transition"
                            />
                          </td>
                          <td className="py-2.5 pr-3">
                            <select
                              value={player.isGoalie || player.position === 'G' ? 'G' : (player.position || 'F')}
                              onChange={e => handlePlayerPositionChange(i, e.target.value)}
                              className="bg-gray-800 border border-gray-600 focus:border-yellow-400 text-white rounded px-2 py-1.5 text-sm focus:outline-none transition"
                            >
                              <option value="F">F</option>
                              <option value="D">D</option>
                              <option value="G">G</option>
                            </select>
                          </td>
                          <td className="py-2.5 pr-3">
                            <input
                              type="number" min={0} step={0.1}
                              value={player.skill ?? player.experience ?? 0}
                              onChange={e => handlePlayerExpChange(i, e.target.value)}
                              className="bg-gray-800 border border-gray-600 focus:border-yellow-400 text-white rounded px-3 py-1.5 text-sm w-20 focus:outline-none transition"
                            />
                          </td>
                          <td className="py-2.5">
                            {movingPlayerIndex === i ? (
                              <div className="flex items-center gap-2">
                                <select
                                  defaultValue=""
                                  onChange={e => {
                                    if (!e.target.value) return
                                    const t = teamList.find(x => x.key === e.target.value)
                                    if (t) handleMoveToTeam(t)
                                  }}
                                  className="bg-blue-900 border border-blue-500 text-white rounded px-2 py-1.5 text-xs focus:outline-none"
                                >
                                  <option value="" disabled>Move to…</option>
                                  {teamList.filter(t => t.key !== editingTeamKey).map(t => (
                                    <option key={t.key} value={t.key}>
                                      {t.team.teamName || `Team ${t.index + 1}`} ({t.division})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => setMovingPlayerIndex(null)}
                                  className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1.5 rounded transition"
                                >✕</button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setMovingPlayerIndex(i)}
                                  className="text-xs bg-gray-700 hover:bg-blue-700 text-gray-300 hover:text-white px-3 py-1.5 rounded transition"
                                >Move</button>
                                <button
                                  onClick={() => handleRemovePlayer(i)}
                                  className="text-xs bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white px-3 py-1.5 rounded transition"
                                >Remove</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add player */}
                <div className="mb-6 p-4 bg-gray-800/60 border border-gray-700 rounded-lg">
                  <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wide mb-3">Add Player</p>
                  {addPlayerError && <p className="text-red-400 text-xs mb-2">{addPlayerError}</p>}
                  <div className="flex gap-2 flex-wrap items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-gray-400 text-xs">Name</label>
                      <input
                        value={addPlayerName}
                        onChange={e => { setAddPlayerName(e.target.value); setAddPlayerError(null) }}
                        onKeyDown={e => e.key === 'Enter' && handleAddPlayerToEdit()}
                        placeholder="Player name"
                        className="bg-gray-700 border border-gray-600 focus:border-yellow-400 text-white rounded px-3 py-1.5 text-sm w-44 focus:outline-none transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-gray-400 text-xs">Position</label>
                      <select value={addPlayerPos} onChange={e => setAddPlayerPos(e.target.value)}
                        className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1.5 text-sm">
                        <option value="F">F</option>
                        <option value="D">D</option>
                        <option value="G">G</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-gray-400 text-xs">Skill</label>
                      <input type="number" min={0} step={0.1}
                        value={addPlayerSkill}
                        onChange={e => setAddPlayerSkill(e.target.value)}
                        placeholder="0"
                        className="bg-gray-700 border border-gray-600 focus:border-yellow-400 text-white rounded px-3 py-1.5 text-sm w-20 focus:outline-none transition"
                      />
                    </div>
                    <button onClick={handleAddPlayerToEdit}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm px-4 py-1.5 rounded transition self-end">
                      + Add
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
                  <button onClick={handleSaveEdit} className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-2.5 rounded transition">Save Changes</button>
                  <button onClick={handleCancelEdit} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded transition">Discard</button>
                  {editSaveMsg && (
                    <span className={`text-sm font-medium ${editSaveMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                      {editSaveMsg.text}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create New Team Panel */}
          {creatingTeam && canCreateTeam && (
            <div ref={createPanelRef} className="bg-gray-900 border-2 border-green-400 rounded-lg overflow-hidden mb-4">
              <div className="bg-green-500 px-6 py-3 flex items-center justify-between">
                <span className="text-black font-bold text-sm">+ CREATE NEW TEAM — {selectedLeague} / {selectedDivision}</span>
                <button onClick={handleCancelCreate} className="text-black hover:text-black/60 font-bold transition">✕ Cancel</button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-green-400 text-xs font-semibold uppercase tracking-wide mb-2">Team Name</label>
                  <input
                    value={newTeam.teamName}
                    onChange={e => { setNewTeam(prev => ({ ...prev, teamName: e.target.value })); setCreateErrors(prev => ({ ...prev, teamName: null })) }}
                    placeholder="e.g. Red Hawks"
                    className={`bg-gray-800 border focus:border-green-400 text-white rounded px-4 py-2 text-sm w-72 focus:outline-none transition ${createErrors.teamName ? 'border-red-500' : 'border-gray-600'}`}
                  />
                  {createErrors.teamName && <p className="text-red-400 text-xs mt-1">{createErrors.teamName}</p>}
                </div>
                <div className="mb-4">
                  <label className="block text-green-400 text-xs font-semibold uppercase tracking-wide mb-2">Add Player</label>
                  <div className="flex gap-2 items-start flex-wrap">
                    <div className="flex flex-col gap-1">
                      <input value={newPlayerName} onChange={e => { setNewPlayerName(e.target.value); setCreateErrors(prev => ({ ...prev, player: null })) }} onKeyDown={e => e.key === 'Enter' && handleAddPlayerToNew()} placeholder="Player name" className={`bg-gray-800 border focus:border-green-400 text-white rounded px-3 py-2 text-sm w-48 focus:outline-none transition ${createErrors.player ? 'border-red-500' : 'border-gray-600'}`} />
                      {createErrors.player && <p className="text-red-400 text-xs">{createErrors.player}</p>}
                    </div>
                    <input type="number" min={0} step={0.1} value={newPlayerExp} onChange={e => setNewPlayerExp(e.target.value)} placeholder="Skill" className="bg-gray-800 border border-gray-600 focus:border-green-400 text-white rounded px-3 py-2 text-sm w-24 focus:outline-none transition" />
                    <button onClick={handleAddPlayerToNew} className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded transition">+ Add</button>
                  </div>
                </div>
                {newTeam.players.length > 0 ? (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Players ({newTeam.players.length})</label>
                      <span className="text-gray-500 text-xs">Avg skill: {calcAvg(newTeam.players)}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-700">
                          <th className="pb-2 pr-4">#</th><th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Skill</th><th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newTeam.players.map((p, i) => (
                          <tr key={i} className={`border-b border-gray-700/50 ${i % 2 === 0 ? '' : 'bg-gray-800/50'}`}>
                            <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                            <td className="py-2 pr-4 text-white">{p.name}</td>
                            <td className="py-2 pr-4 text-gray-300">{p.skill}</td>
                            <td className="py-2"><button onClick={() => handleRemoveNewPlayer(i)} className="text-xs bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white px-3 py-1 rounded transition">Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {createErrors.players && <p className="text-red-400 text-xs mt-2">{createErrors.players}</p>}
                  </div>
                ) : (
                  <div className="mb-6 p-4 border border-dashed border-gray-600 rounded text-center text-gray-500 text-sm">
                    No players added yet.
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
        <div className="bg-gray-800 p-6 rounded-lg text-center">
          {!teamsLoaded ? (
            <p className="text-gray-400">Loading saved teams…</p>
          ) : (
            <p className="text-gray-500">
              No draft teams yet.{' '}
              {canCreateTeam ? (
                <span>Click <span className="text-green-400 cursor-pointer hover:underline" onClick={handleStartCreate}>+ Create New Team</span> or go to{' '}<Link to="/admin/generate-teams" className="text-red-400 hover:underline">Generate Teams</Link> to build balanced teams.</span>
              ) : (
                <span>Go to <Link to="/admin/generate-teams" className="text-red-400 hover:underline">Generate Teams</Link> to build balanced teams, or select a league and division above to manually create one.</span>
              )}
            </p>
          )}
        </div>
      )}


      {/* Edit Committed Team Roster Modal */}
      {stRosterEditId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl border border-green-700 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-green-900/30 rounded-t-xl">
              <h2 className="text-white font-semibold">Edit Team</h2>
              <button onClick={() => setStRosterEditId(null)} className="text-gray-400 hover:text-white text-lg transition">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {stRosterMsg && (
                <p className={`text-sm mb-3 ${stRosterMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{stRosterMsg.text}</p>
              )}
              <div className="mb-5">
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Team Name</label>
                <input
                  value={stRosterEditName}
                  onChange={e => setStRosterEditName(e.target.value)}
                  className="bg-gray-700 border border-gray-600 focus:border-green-500 text-white rounded px-3 py-2 text-sm w-full focus:outline-none transition"
                />
              </div>
              <div className="mb-5">
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  Roster <span className="text-gray-500 normal-case font-normal">({stRosterPlayers.length} players)</span>
                </label>
                {stRosterPlayers.length === 0 ? (
                  <p className="text-gray-500 text-sm">No players on this team.</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {stRosterPlayers.map(p => (
                      <div key={p.PlayerID} className="flex items-center justify-between bg-gray-700/50 rounded px-3 py-1.5">
                        <span className="text-white text-sm">{p.FirstName} {p.LastName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs">{p.Position || '—'}</span>
                          <button
                            onClick={() => setStRosterPlayers(prev => prev.filter(x => x.PlayerID !== p.PlayerID))}
                            className="text-red-400 hover:text-red-300 text-xs transition"
                            title="Remove player"
                          >✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Add Player</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name…"
                    value={stRosterSearch}
                    onChange={e => handleStRosterSearch(e.target.value)}
                    className="bg-gray-700 border border-gray-600 focus:border-green-500 text-white rounded px-3 py-2 text-sm w-full focus:outline-none transition"
                  />
                  {stRosterResults.filter(r => !stRosterPlayers.some(p => p.PlayerID === r.PlayerID)).length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded shadow-lg max-h-40 overflow-y-auto z-10">
                      {stRosterResults
                        .filter(r => !stRosterPlayers.some(p => p.PlayerID === r.PlayerID))
                        .map(r => (
                          <button
                            key={r.PlayerID}
                            onClick={() => {
                              setStRosterPlayers(prev => [...prev, r])
                              setStRosterSearch('')
                              setStRosterResults([])
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-600 text-white text-sm flex items-center justify-between transition"
                          >
                            <span>{r.FirstName} {r.LastName}</span>
                            <span className="text-gray-400 text-xs">{r.Position || '—'}</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={handleStRosterSave}
                disabled={stRosterSaving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded font-medium transition"
              >
                {stRosterSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setStRosterEditId(null)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-medium transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Committed Team Confirmation Modal */}
      {stDeleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-gray-800 rounded-lg p-6 w-80 shadow-xl border border-gray-700">
            <h2 className="text-white font-semibold text-lg mb-2">Delete Committed Team</h2>
            <p className="text-gray-400 text-sm mb-2">
              Delete <span className="text-white font-medium">{scheduledTeams.find(t => t.ScheduledTeamID === stDeleteConfirmId)?.Name}</span>?
            </p>
            <p className="text-red-400 text-xs mb-6">This will also delete all games involving this team.</p>
            <div className="flex gap-3">
              <button onClick={() => handleStDelete(stDeleteConfirmId)} disabled={stSaving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded font-medium transition">Delete</button>
              <button onClick={() => setStDeleteConfirmId(null)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-medium transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Draft Teams Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl border border-gray-700">
            <h2 className="text-white font-semibold text-lg mb-2">Delete Draft Teams</h2>
            <p className="text-gray-400 text-sm mb-1">
              {deleteTarget.division
                ? <>Delete all draft teams in <span className="text-white font-medium">{deleteTarget.division}</span> ({deleteTarget.league})?</>
                : <>Delete <span className="text-white font-medium">all draft teams</span> for {deleteTarget.league}?</>
              }
            </p>
            <p className="text-yellow-400 text-xs mb-6">
              This only removes draft teams. Committed teams in the Schedule Manager are not affected.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDeleteConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium transition">Delete</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-medium transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Draft Team Confirmation Modal */}
      {deleteTeamConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-gray-800 rounded-lg p-6 w-80 shadow-xl border border-gray-700">
            <h2 className="text-white font-semibold text-lg mb-2">Delete Team</h2>
            <p className="text-gray-400 text-sm mb-1">
              Delete <span className="text-white font-medium">{deleteTeamConfirm.teamName}</span>?
            </p>
            <p className="text-gray-500 text-xs mb-6">{deleteTeamConfirm.league} / {deleteTeamConfirm.division}</p>
            <div className="flex gap-3">
              <button onClick={handleDeleteTeamConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium transition">Delete</button>
              <button onClick={() => setDeleteTeamConfirm(null)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-medium transition">Cancel</button>
            </div>
          </div>
        </div>
      )}


      {/* Create Team Confirmation Modal */}
      {showCreateConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-gray-800 rounded-lg p-6 w-80 shadow-xl border border-gray-700">
            <h2 className="text-white font-semibold text-lg mb-2">Create Team</h2>
            <p className="text-gray-400 text-sm mb-6">
              Create <span className="text-white font-medium">{newTeam.teamName}</span> in <span className="text-white font-medium">{selectedLeague} / {selectedDivision}</span> with <span className="text-white font-medium">{newTeam.players.length} players</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={handleCreateConfirm} className="flex-1 bg-green-500 hover:bg-green-600 text-black py-2 rounded font-medium transition">Create</button>
              <button onClick={() => setShowCreateConfirm(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-medium transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Division Modal */}
      {bulkAssignOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md shadow-2xl border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Bulk Assign Division</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  {unassignedTeams.length} unassigned team{unassignedTeams.length !== 1 ? 's' : ''} · {selectedLeague}
                </p>
              </div>
              <button onClick={() => setBulkAssignOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {assignError && <p className="text-red-400 text-sm bg-red-900/30 border border-red-700 rounded p-2">{assignError}</p>}
              <div className="text-gray-400 text-sm">
                The following teams will all be moved to the selected division:
                <ul className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                  {unassignedTeams.map(({ teamKey, team }) => (
                    <li key={teamKey} className="text-white text-xs bg-gray-700/50 rounded px-2 py-1">
                      {team.teamName || teamKey}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Destination Division</label>
                <select value={assignDest} onChange={e => { setAssignDest(e.target.value); setAssignError(null) }}
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm">
                  <option value="" disabled>Select a division…</option>
                  {(() => {
                    const leagueRef = leagues.find(l => l.name === selectedLeague)
                    const divs = leagueRef ? getDivisionsForLeague(leagueRef.id) : []
                    const existing = Object.keys(allTeams[selectedLeague] || {}).filter(d => !d.startsWith('_unassigned'))
                    const divNames = [...new Set([...divs.map(d => d.name), ...existing])]
                    return divNames.map(name => <option key={name} value={name}>{name}</option>)
                  })()}
                  <option value="__new__">+ Create new division…</option>
                </select>
              </div>
              {assignDest === '__new__' && (
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">New Division Name</label>
                  <input value={newDivName} onChange={e => { setNewDivName(e.target.value); setAssignError(null) }}
                    placeholder="e.g. Beginner" autoFocus
                    className="bg-gray-700 border border-gray-600 focus:border-yellow-400 text-white rounded px-3 py-2 text-sm focus:outline-none transition" />
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
              <button onClick={handleBulkAssignToDivision} disabled={assignSaving || !assignDest}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold py-2 rounded transition">
                {assignSaving ? 'Saving…' : `Assign All ${unassignedTeams.length} Teams`}
              </button>
              <button onClick={() => setBulkAssignOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Division Modal */}
      {assigningTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md shadow-2xl border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Assign to Division</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  {assigningTeam.team.teamName || 'Team'} · {assigningTeam.league}
                </p>
              </div>
              <button onClick={() => setAssigningTeam(null)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {assignError && <p className="text-red-400 text-sm bg-red-900/30 border border-red-700 rounded p-2">{assignError}</p>}
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Division</label>
                <select value={assignDest} onChange={e => { setAssignDest(e.target.value); setAssignError(null) }}
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm">
                  <option value="" disabled>Select a division…</option>
                  {(() => {
                    const leagueRef = leagues.find(l => l.name === assigningTeam.league)
                    const divs = leagueRef ? getDivisionsForLeague(leagueRef.id) : []
                    // also include any divisions already in allTeams for this league
                    const existing = Object.keys(allTeams[assigningTeam.league] || {}).filter(d => !d.startsWith('_unassigned'))
                    const divNames = [...new Set([...divs.map(d => d.name), ...existing])]
                    return divNames.map(name => <option key={name} value={name}>{name}</option>)
                  })()}
                  <option value="__new__">+ Create new division…</option>
                </select>
              </div>
              {assignDest === '__new__' && (
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">New Division Name</label>
                  <input value={newDivName} onChange={e => { setNewDivName(e.target.value); setAssignError(null) }}
                    placeholder="e.g. Beginner" autoFocus
                    className="bg-gray-700 border border-gray-600 focus:border-blue-400 text-white rounded px-3 py-2 text-sm focus:outline-none transition" />
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
              <button onClick={handleAssignToDivision} disabled={assignSaving || !assignDest}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold py-2 rounded transition">
                {assignSaving ? 'Saving…' : 'Assign'}
              </button>
              <button onClick={() => setAssigningTeam(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}