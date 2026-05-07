import { useState, useEffect } from 'react'
import { getAuthToken, AUTH_HEADER_KEY } from '../context/Authentication'

function PreviewRow({ label, count }) {
  return (
    <div className="flex justify-between items-center text-sm py-1.5 border-b border-gray-700 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className={count > 0 ? 'text-red-400 font-semibold tabular-nums' : 'text-gray-600 tabular-nums'}>
        {count}
      </span>
    </div>
  )
}

export default function SeasonReset({ onReset }) {
  const [leagues,          setLeagues]          = useState([])
  const [seasons,          setSeasons]          = useState([])
  const [leagueID,         setLeagueID]         = useState('')
  const [seasonID,         setSeasonID]         = useState('')
  const [includeDivisions, setIncludeDivisions] = useState(false)
  const [preview,          setPreview]          = useState(null)
  const [loadingPreview,   setLoadingPreview]   = useState(false)
  const [confirmText,      setConfirmText]      = useState('')
  const [executing,        setExecuting]        = useState(false)
  const [result,           setResult]           = useState(null)
  const [error,            setError]            = useState(null)

  useEffect(() => {
    fetch('/api/leagues-divisions')
      .then(r => r.json())
      .then(data => {
        setLeagues(data.leagues || [])
        setSeasons(data.seasons || [])
      })
      .catch(() => {})
  }, [])

  const filteredSeasons = leagueID
    ? seasons.filter(s => s.leagueID === Number(leagueID))
    : seasons

  const authHeaders = () => ({ [AUTH_HEADER_KEY]: getAuthToken() })

  const resetPreview = () => {
    setPreview(null)
    setConfirmText('')
    setResult(null)
    setError(null)
  }

  const handlePreview = async () => {
    setLoadingPreview(true)
    resetPreview()
    const params = new URLSearchParams()
    if (leagueID) params.set('leagueID', leagueID)
    if (seasonID) params.set('seasonID', seasonID)
    params.set('includeDivisions', String(includeDivisions))
    try {
      const res  = await fetch(`/api/season-reset/preview?${params}`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Preview failed.')
      setPreview(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleReset = async () => {
    if (confirmText !== 'RESET') return
    setExecuting(true)
    setError(null)
    try {
      const res  = await fetch('/api/season-reset', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify({
          leagueID:         leagueID  ? Number(leagueID)  : undefined,
          seasonID:         seasonID  ? Number(seasonID)  : undefined,
          includeDivisions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed.')
      setResult(data)
      setPreview(null)
      setConfirmText('')
      onReset?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setExecuting(false)
    }
  }

  const scopeLabel = () => {
    const league = leagues.find(l => l.id === Number(leagueID))
    const season = seasons.find(s => s.id === Number(seasonID))
    const parts  = [league?.name ?? 'All leagues', season?.name ?? 'all seasons']
    return parts.join(' · ')
  }

  const isEmpty = preview && preview.draftCount === 0 && preview.teamCount === 0 && preview.divisionCount === 0
  const canExecute = preview && !isEmpty && confirmText === 'RESET' && !executing

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Season Reset</h1>
      <p className="text-gray-400 mb-6 text-sm leading-relaxed">
        Clears draft teams, scheduled teams, and games so the next season can be structured from scratch.
        Players, leagues, and season records are preserved.
      </p>

      {/* Warning banner */}
      <div className="flex gap-3 items-start bg-red-950/60 border border-red-700 rounded-lg p-4 mb-6">
        <span className="text-red-400 text-lg leading-none mt-0.5">⚠</span>
        <div>
          <p className="text-red-300 font-semibold text-sm">This action is permanent and cannot be undone.</p>
          <p className="text-red-400/80 text-xs mt-0.5">All deletions are recorded in the audit log.</p>
        </div>
      </div>

      {/* Scope selection */}
      <div className="bg-gray-800 rounded-lg p-6 mb-4">
        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Select Scope</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs uppercase tracking-wide font-semibold">League</label>
            <select
              value={leagueID}
              onChange={e => { setLeagueID(e.target.value); setSeasonID(''); resetPreview() }}
              className="bg-gray-700 border border-gray-600 focus:border-blue-400 text-white rounded px-3 py-2 text-sm focus:outline-none transition"
            >
              <option value="">All leagues</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Season</label>
            <select
              value={seasonID}
              onChange={e => { setSeasonID(e.target.value); resetPreview() }}
              className="bg-gray-700 border border-gray-600 focus:border-blue-400 text-white rounded px-3 py-2 text-sm focus:outline-none transition"
            >
              <option value="">All seasons</option>
              {filteredSeasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDivisions}
              onChange={e => { setIncludeDivisions(e.target.checked); resetPreview() }}
              className="mt-0.5 w-4 h-4 accent-red-500 shrink-0"
            />
            <div>
              <span className="text-gray-300 text-sm">Also delete division records</span>
              {includeDivisions && (
                <p className="text-yellow-400/90 text-xs mt-1 leading-relaxed">
                  Divisions will be removed so they can be rebuilt for the new season.
                  All teams across every season in those divisions will also be deleted.
                </p>
              )}
            </div>
          </label>
        </div>
      </div>

      <button
        onClick={handlePreview}
        disabled={loadingPreview}
        className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm py-2.5 rounded-lg transition mb-4 font-medium"
      >
        {loadingPreview ? 'Loading preview…' : 'Preview what will be deleted'}
      </button>

      {error && (
        <p className="text-red-400 text-sm mb-4 bg-red-950/40 border border-red-800 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Preview panel */}
      {preview && (
        <div className="bg-gray-800 rounded-lg p-6 mb-4">
          <div className="mb-4">
            <h2 className="text-white font-semibold">Preview</h2>
            <p className="text-gray-500 text-xs mt-0.5">{scopeLabel()} — nothing deleted yet</p>
          </div>

          {isEmpty ? (
            <p className="text-gray-400 text-sm py-2">Nothing to delete for this scope.</p>
          ) : (
            <>
              <div className="mb-6">
                <PreviewRow label="Draft teams"      count={preview.draftCount} />
                <PreviewRow label="Scheduled teams"  count={preview.teamCount} />
                <PreviewRow label="Games"            count={preview.gameCount} />
                {includeDivisions && <PreviewRow label="Divisions" count={preview.divisionCount} />}
              </div>

              <div className="border-t border-gray-700 pt-5">
                <p className="text-gray-300 text-sm mb-3">
                  Type <span className="font-mono font-bold text-red-400">RESET</span> to confirm:
                </p>
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="RESET"
                  autoComplete="off"
                  className="bg-gray-700 border border-gray-600 focus:border-red-500 text-white rounded px-3 py-2 text-sm w-full focus:outline-none transition mb-3 font-mono"
                />
                <button
                  onClick={handleReset}
                  disabled={!canExecute}
                  className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition text-sm"
                >
                  {executing ? 'Resetting…' : 'Execute Reset'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Success result */}
      {result && (
        <div className="bg-green-950/50 border border-green-700 rounded-lg p-5">
          <p className="text-green-400 font-semibold mb-3">Reset complete.</p>
          <div className="flex flex-col gap-1 text-sm text-gray-300">
            <span>{result.draftTeamsDeleted} draft team{result.draftTeamsDeleted !== 1 ? 's' : ''} removed</span>
            <span>{result.teamsDeleted} scheduled team{result.teamsDeleted !== 1 ? 's' : ''} removed</span>
            <span>{result.gamesDeleted} game{result.gamesDeleted !== 1 ? 's' : ''} removed</span>
            {result.divisionsDeleted > 0 && (
              <span>{result.divisionsDeleted} division{result.divisionsDeleted !== 1 ? 's' : ''} removed</span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-3">
            You can now add new divisions and generate teams for the new season.
          </p>
        </div>
      )}
    </div>
  )
}
