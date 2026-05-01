// Upload page — two-step workflow for generating balanced teams from CSV data.
//
// Step 1: Load reference data
//   The admin uploads four CSV exports from their database (league, division,
//   season, team). useLeagues() parses them client-side and populates the
//   dropdowns in Step 2. Alternatively, the admin can create leagues and
//   divisions on the fly without uploading CSVs.
//
// Step 2: Generate teams
//   The admin selects a league, division, algorithm, and team count, then
//   uploads the player.csv and player_team.csv files. These are sent to
//   /api/generate-teams/advanced which runs the balancing algorithm on the
//   server and returns a teams object. That object is passed up to App.jsx
//   via onTeamsGenerated() so it appears immediately in the Dashboard.
import { useRef, useState } from 'react'
import useLeagues from '../hooks/useLeagues'

export default function Upload({ onTeamsGenerated }) {
  const {
    leagues,
    loaded: leaguesLoaded,
    error: leaguesError,
    loadFromFiles,
    addLeague,
    addDivision,
    getDivisionsForLeague,
    getLatestSeasonForLeague,
  } = useLeagues()

  // Reference CSV file state
  const leagueFileRef   = useRef(null)
  const divisionFileRef = useRef(null)
  const seasonFileRef   = useRef(null)
  const teamFileRef     = useRef(null)
  const [refFiles,    setRefFiles]    = useState({ league: null, division: null, season: null, team: null })
  const [refLoading,  setRefLoading]  = useState(false)
  const [refError,    setRefError]    = useState(null)

  // Create league state
  const [showCreateLeague,  setShowCreateLeague]  = useState(false)
  const [newLeagueName,     setNewLeagueName]      = useState('')
  const [createLeagueError, setCreateLeagueError] = useState(null)

  // Create division state
  const [showCreateDivision,  setShowCreateDivision]  = useState(false)
  const [newDivisionName,     setNewDivisionName]      = useState('')
  const [newDivisionLeague,   setNewDivisionLeague]    = useState('')
  const [createDivisionError, setCreateDivisionError] = useState(null)

  // Player upload file state
  const playerFileRef     = useRef(null)
  const playerTeamFileRef = useRef(null)
  const [playerFile,     setPlayerFile]     = useState(null)
  const [playerTeamFile, setPlayerTeamFile] = useState(null)

  // Selection state
  const [selectedLeague,   setSelectedLeague]   = useState('')
  const [selectedDivision, setSelectedDivision] = useState('')
  const [numTeams,         setNumTeams]          = useState(4)
  const [algorithm,        setAlgorithm]         = useState('')

  // UI state
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [apiError, setApiError] = useState(null)
  const [success,  setSuccess]  = useState(false)

  const divisionsForLeague  = selectedLeague ? getDivisionsForLeague(selectedLeague) : []
  const selectedLeagueObj   = leagues.find(l => String(l.id) === String(selectedLeague))
  const selectedDivisionObj = divisionsForLeague.find(d => String(d.id) === String(selectedDivision))

  // ── Reference CSV handlers ──────────────────────────────────────────────────

  const handleRefFile = (key, file) => {
    if (!file?.name.toLowerCase().endsWith('.csv')) return
    setRefFiles(prev => ({ ...prev, [key]: file }))
  }

  const allRefFilesReady = refFiles.league && refFiles.division && refFiles.season && refFiles.team

  const handleLoadReferenceData = async () => {
    if (!allRefFilesReady) { setRefError('Please upload all four reference CSV files.'); return }
    setRefLoading(true)
    setRefError(null)
    const result = await loadFromFiles(refFiles.league, refFiles.division, refFiles.season, refFiles.team)
    if (!result) setRefError('Failed to parse one or more reference files.')
    setRefLoading(false)
  }

  // ── Manual league/division creation ────────────────────────────────────────
  // These add entries to the local useLeagues state only. They get a "custom-"
  // prefix ID and show a ★ in the dropdown. When teams are later saved to DB via
  // the Dashboard, the league/division is auto-created in the DB at that point.
  const handleCreateLeague = () => {
    if (!newLeagueName.trim()) {
      setCreateLeagueError('League name is required.')
      return
    }
    if (leagues.find(l => l.name.toLowerCase() === newLeagueName.trim().toLowerCase())) {
      setCreateLeagueError('A league with that name already exists.')
      return
    }
    const created = addLeague(newLeagueName.trim())
    setSelectedLeague(created.id)
    setSelectedDivision('')
    setNewLeagueName('')
    setShowCreateLeague(false)
    setCreateLeagueError(null)
  }

  // --- Create division handler ---
  const handleCreateDivision = () => {
    if (!newDivisionName.trim()) {
      setCreateDivisionError('Division name is required.')
      return
    }
    if (!newDivisionLeague) {
      setCreateDivisionError('Please select which league this division belongs to.')
      return
    }
    const leagueObj = leagues.find(l => String(l.id) === String(newDivisionLeague))
    const existing  = getDivisionsForLeague(newDivisionLeague)
    if (existing.find(d => d.name.toLowerCase() === newDivisionName.trim().toLowerCase())) {
      setCreateDivisionError('A division with that name already exists in this league.')
      return
    }
    const created = addDivision(newDivisionName.trim(), newDivisionLeague, leagueObj?.name || '')
    // Auto-select the new division if the league is already selected
    if (String(selectedLeague) === String(newDivisionLeague)) {
      setSelectedDivision(created.id)
    }
    setNewDivisionName('')
    setNewDivisionLeague('')
    setShowCreateDivision(false)
    setCreateDivisionError(null)
  }

  // ── Player CSV file handlers ────────────────────────────────────────────────
  const handlePlayerFile = (file) => {
    if (!file?.name.toLowerCase().endsWith('.csv')) {
      setErrors(prev => ({ ...prev, playerFile: 'Must be a CSV file.' }))
      return
    }
    setErrors(prev => ({ ...prev, playerFile: null }))
    setPlayerFile(file)
  }

  const handlePlayerTeamFile = (file) => {
    if (!file?.name.toLowerCase().endsWith('.csv')) {
      setErrors(prev => ({ ...prev, playerTeamFile: 'Must be a CSV file.' }))
      return
    }
    setErrors(prev => ({ ...prev, playerTeamFile: null }))
    setPlayerTeamFile(file)
  }

  const handleDrop = (e, setter) => {
    e.preventDefault()
    setter(e.dataTransfer.files[0])
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  // Returns true only if all required fields are filled; otherwise populates
  // the errors object so each field can show its own red error message.
  const validate = () => {
    const newErrors = {}
    if (!selectedLeague)   newErrors.league        = 'Please select a league.'
    if (!selectedDivision) newErrors.division       = 'Please select a division.'
    if (!algorithm)        newErrors.algorithm      = 'Please select an algorithm.'
    if (!playerFile)       newErrors.playerFile     = 'player.csv is required.'
    if (!playerTeamFile)   newErrors.playerTeamFile = 'player_team.csv is required.'
    if (numTeams < 2)      newErrors.numTeams       = 'Must be at least 2 teams.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  // Builds a multipart FormData payload (files can't be sent as JSON) and posts
  // to the generate-teams endpoint. On success the resulting teams map is passed
  // up to App.jsx so the Dashboard can immediately display them.
  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setApiError(null)
    setSuccess(false)

    try {
      const latestSeason = getLatestSeasonForLeague(selectedLeague)
      const formData = new FormData()
      formData.append('playerFile',     playerFile)
      formData.append('playerTeamFile', playerTeamFile)
      formData.append('num_teams',      numTeams)
      formData.append('division_name',  selectedDivisionObj?.name || '')
      formData.append('league_name',    selectedLeagueObj?.name   || '')
      if (latestSeason) formData.append('season_id', latestSeason.id)

      const res  = await fetch('/api/generate-teams/advanced', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) { setApiError(data.error || 'Something went wrong.'); setLoading(false); return }

      if (onTeamsGenerated) {
        onTeamsGenerated(data.teams, `${selectedLeagueObj?.name} — ${selectedDivisionObj?.name}`, selectedLeagueObj?.name, selectedDivisionObj?.name)
      }

      setSuccess(true)
      setPlayerFile(null)
      setPlayerTeamFile(null)
      setSelectedLeague('')
      setSelectedDivision('')
      setAlgorithm('')
      setNumTeams(4)
    } catch (e) {
      setApiError('Could not connect to the server. Is the backend running?')
    }
    setLoading(false)
  }

  // ── Sub-components ──────────────────────────────────────────────────────────
  // Defined inline so they can close over handleRefFile and the errors object
  // without extra prop drilling.
  const SmallDropZone = ({ label, fileKey, inputRef }) => {
    const file = refFiles[fileKey]
    return (
      <div className="flex flex-col gap-1">
        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{label}</label>
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleRefFile(fileKey, e.dataTransfer.files[0]) }}
          onClick={() => inputRef.current.click()}
          className={`border border-dashed rounded px-3 py-2 text-center cursor-pointer transition text-xs ${
            file ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-600 hover:border-gray-400 text-gray-500'
          }`}
        >
          {file ? `✅ ${file.name}` : 'Click or drag to upload'}
        </div>
        <input ref={inputRef} type="file" accept=".csv" onChange={e => handleRefFile(fileKey, e.target.files[0])} style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 0, height: 0, opacity: 0 }} />
      </div>
    )
  }

  // --- Large drop zone for player files ---
  const DropZone = ({ label, file, onFile, errorKey }) => {
    const [dragging, setDragging] = useState(false)
    const ref = useRef(null)
    return (
      <div className="flex flex-col gap-1">
        <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{label}</label>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={e => { e.preventDefault(); setDragging(false) }}
          onDrop={e => { setDragging(false); handleDrop(e, onFile) }}
          onClick={() => ref.current.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition text-sm ${
            dragging ? 'border-red-500 bg-red-500/10'
            : file    ? 'border-green-500 bg-green-500/10'
            : errors[errorKey] ? 'border-red-500'
            : 'border-gray-600 hover:border-gray-400 hover:bg-gray-700/50'
          }`}
        >
          {dragging ? <p className="text-red-400">Drop it here!</p>
          : file     ? <p className="text-green-400">✅ {file.name}</p>
          :              <p className="text-gray-400">Drag & drop or click to browse</p>}
        </div>
        {errors[errorKey] && <p className="text-red-400 text-xs">{errors[errorKey]}</p>}
        <input ref={ref} type="file" accept=".csv" onChange={e => onFile(e.target.files[0])} style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 0, height: 0, opacity: 0 }} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Upload Data</h1>

      {/* Step 1 — Load reference CSVs */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Step 1 — Load League & Division Data
            {leaguesLoaded && <span className="ml-2 text-green-400 text-sm font-normal">✅ Loaded</span>}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Upload your reference CSVs to populate the dropdowns, or skip and create leagues and divisions manually below.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-4">
          <SmallDropZone label="league.csv"   fileKey="league"   inputRef={leagueFileRef}   />
          <SmallDropZone label="division.csv" fileKey="division" inputRef={divisionFileRef} />
          <SmallDropZone label="season.csv"   fileKey="season"   inputRef={seasonFileRef}   />
          <SmallDropZone label="team.csv"     fileKey="team"     inputRef={teamFileRef}     />
        </div>

        {refError && <p className="text-red-400 text-sm mb-3">{refError}</p>}

        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={handleLoadReferenceData}
            disabled={!allRefFilesReady || refLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded transition"
          >
            {refLoading ? 'Loading...' : leaguesLoaded ? 'Reload Reference Data' : 'Load Reference Data'}
          </button>

          {/* Create League */}
          <button
            onClick={() => { setShowCreateLeague(!showCreateLeague); setShowCreateDivision(false) }}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded transition"
          >
            + Create League
          </button>

          {/* Create Division */}
          <button
            onClick={() => { setShowCreateDivision(!showCreateDivision); setShowCreateLeague(false) }}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded transition"
          >
            + Create Division
          </button>
        </div>

        {leaguesLoaded && (
          <p className="text-gray-500 text-xs mt-3">
            {leagues.length} leagues loaded.
          </p>
        )}

        {/* Create League Form */}
        {showCreateLeague && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <h3 className="text-white font-medium text-sm mb-3">Create New League</h3>
            <div className="flex gap-3 items-start flex-wrap">
              <div className="flex flex-col gap-1">
                <input
                  value={newLeagueName}
                  onChange={e => { setNewLeagueName(e.target.value); setCreateLeagueError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateLeague()}
                  placeholder="e.g. WEHA Fall Adult Leagues 2026"
                  className={`bg-gray-800 border text-white rounded px-3 py-2 text-sm w-72 focus:outline-none focus:border-blue-400 transition ${createLeagueError ? 'border-red-500' : 'border-gray-600'}`}
                />
                {createLeagueError && <p className="text-red-400 text-xs">{createLeagueError}</p>}
              </div>
              <button
                onClick={handleCreateLeague}
                className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded transition"
              >
                Create
              </button>
              <button
                onClick={() => { setShowCreateLeague(false); setNewLeagueName(''); setCreateLeagueError(null) }}
                className="bg-gray-600 hover:bg-gray-500 text-white text-sm px-4 py-2 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Create Division Form */}
        {showCreateDivision && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <h3 className="text-white font-medium text-sm mb-3">Create New Division</h3>
            {leagues.length === 0 ? (
              <p className="text-gray-400 text-sm">No leagues available. Load reference data or create a league first.</p>
            ) : (
              <div className="flex gap-3 items-start flex-wrap">
                <div className="flex flex-col gap-1">
                  <select
                    value={newDivisionLeague}
                    onChange={e => { setNewDivisionLeague(e.target.value); setCreateDivisionError(null) }}
                    className={`bg-gray-800 border text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 transition ${createDivisionError && !newDivisionLeague ? 'border-red-500' : 'border-gray-600'}`}
                  >
                    <option value="" disabled>Select League</option>
                    {leagues.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    value={newDivisionName}
                    onChange={e => { setNewDivisionName(e.target.value); setCreateDivisionError(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleCreateDivision()}
                    placeholder="e.g. A League"
                    className={`bg-gray-800 border text-white rounded px-3 py-2 text-sm w-48 focus:outline-none focus:border-blue-400 transition ${createDivisionError && !newDivisionName ? 'border-red-500' : 'border-gray-600'}`}
                  />
                  {createDivisionError && <p className="text-red-400 text-xs">{createDivisionError}</p>}
                </div>
                <button
                  onClick={handleCreateDivision}
                  className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded transition"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowCreateDivision(false); setNewDivisionName(''); setNewDivisionLeague(''); setCreateDivisionError(null) }}
                  className="bg-gray-600 hover:bg-gray-500 text-white text-sm px-4 py-2 rounded transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2 — Generate teams */}
      <div className={`bg-gray-800 p-6 rounded-lg ${!leaguesLoaded && leagues.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-semibold mb-4">
          Step 2 — Generate Teams
          {!leaguesLoaded && leagues.length === 0 && (
            <span className="ml-2 text-gray-500 text-sm font-normal">(complete Step 1 first)</span>
          )}
        </h2>

        {success && (
          <div className="mb-6 p-3 bg-green-700 text-white rounded">
            ✅ Teams generated successfully! Check the Dashboard.
          </div>
        )}
        {apiError && (
          <div className="mb-6 p-3 bg-red-700 text-white rounded">{apiError}</div>
        )}

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">League</label>
            <select
              value={selectedLeague}
              onChange={e => { setSelectedLeague(e.target.value); setSelectedDivision(''); setErrors(prev => ({ ...prev, league: null, division: null })) }}
              className={`p-2 rounded bg-gray-700 border text-white ${errors.league ? 'border-red-500' : 'border-gray-600'}`}
            >
              <option value="" disabled>Select League</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}{l.custom ? ' ★' : ''}
                </option>
              ))}
            </select>
            {errors.league && <p className="text-red-400 text-xs">{errors.league}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Division</label>
            <select
              value={selectedDivision}
              onChange={e => { setSelectedDivision(e.target.value); setErrors(prev => ({ ...prev, division: null })) }}
              disabled={!selectedLeague || divisionsForLeague.length === 0}
              className={`p-2 rounded bg-gray-700 border text-white disabled:opacity-50 ${errors.division ? 'border-red-500' : 'border-gray-600'}`}
            >
              <option value="" disabled>
                {!selectedLeague ? 'Select a league first' : divisionsForLeague.length === 0 ? 'No divisions — create one above' : 'Select Division'}
              </option>
              {divisionsForLeague.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.custom ? ' ★' : ''}
                </option>
              ))}
            </select>
            {errors.division && <p className="text-red-400 text-xs">{errors.division}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Algorithm</label>
            <select
              value={algorithm}
              onChange={e => { setAlgorithm(e.target.value); setErrors(prev => ({ ...prev, algorithm: null })) }}
              className={`p-2 rounded bg-gray-700 border text-white ${errors.algorithm ? 'border-red-500' : 'border-gray-600'}`}
            >
              <option value="" disabled>Select Algorithm</option>
              <option value="Team Fairness">Team Fairness</option>
              <option value="Game Scheduling">Game Scheduling</option>
            </select>
            {errors.algorithm && <p className="text-red-400 text-xs">{errors.algorithm}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Number of Teams</label>
            <input
              type="number"
              min={2}
              max={30}
              value={numTeams}
              onChange={e => { setNumTeams(parseInt(e.target.value) || 2); setErrors(prev => ({ ...prev, numTeams: null })) }}
              className={`p-2 rounded bg-gray-700 border text-white ${errors.numTeams ? 'border-red-500' : 'border-gray-600'}`}
            />
            {errors.numTeams && <p className="text-red-400 text-xs">{errors.numTeams}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <DropZone label="Player CSV (player.csv)" file={playerFile} onFile={handlePlayerFile} errorKey="playerFile" />
          <DropZone label="Player Team CSV (player_team.csv)" file={playerTeamFile} onFile={handlePlayerTeamFile} errorKey="playerTeamFile" />
        </div>

        {selectedLeague && selectedDivision && (
          <div className="mb-6 p-3 bg-gray-700 rounded text-sm text-gray-300">
            Generating <strong className="text-white">{numTeams} teams</strong> for{' '}
            <strong className="text-white">{selectedLeagueObj?.name}</strong>{' '}
            — <strong className="text-white">{selectedDivisionObj?.name}</strong>{' '}
            using <strong className="text-white">{algorithm || '...'}</strong>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-8 py-2.5 rounded transition"
        >
          {loading ? 'Generating Teams...' : 'Generate Teams'}
        </button>
      </div>
    </div>
  )
}