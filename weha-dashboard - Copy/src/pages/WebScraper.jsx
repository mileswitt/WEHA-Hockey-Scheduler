import { useState, useEffect, useRef, useCallback } from 'react'
import { getAuthToken, AUTH_HEADER_KEY } from '../context/Authentication'

const POLL_MS = 20_000 // 20 seconds between status polls

export default function WebScraper() {
  const [status, setStatus]   = useState(null)   // scraperStatus from API
  const [polling, setPolling] = useState(false)
  const [log, setLog]         = useState([])
  const pollRef               = useRef(null)
  const logEndRef             = useRef(null)

  // Scroll log to bottom on new lines
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  // Cleanup interval on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // Stop polling once the scraper finishes
  useEffect(() => {
    if (status && !status.running && polling) {
      clearInterval(pollRef.current)
      setPolling(false)
    }
  }, [status, polling])

  const pollStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/webScrapeStatus')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const s    = data.scraperStatus
      setStatus(s)
      if (s.logs?.length) {
        setLog(s.logs)
      } else if (s.message) {
        setLog(prev => {
          const last = prev[prev.length - 1]
          return last === s.message ? prev : [...prev, s.message]
        })
      }
    } catch {
      // network blip — keep polling
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    setPolling(true)
    pollStatus()                                         // immediate first poll
    pollRef.current = setInterval(pollStatus, POLL_MS)
  }, [pollStatus])

  // On mount: pick up any in-progress run (handles page reload mid-scrape)
  useEffect(() => {
    fetch('/api/webScrapeStatus')
      .then(r => r.json())
      .then(data => {
        const s = data.scraperStatus
        setStatus(s)
        if (s.logs?.length)  setLog(s.logs)
        else if (s.message)  setLog([s.message])
        if (s.running) startPolling()
      })
      .catch(() => {})
  }, [startPolling])

  async function handleRun() {
    setLog([])
    setStatus({ running: true, success: false, message: 'Sending request...', step: 0, logs: [], error: '' })
    try {
      const res  = await fetch('/api/runWebScrape', {
        method:  'POST',
        headers: { [AUTH_HEADER_KEY]: getAuthToken() },
      })
      const data = await res.json()
      const s    = data.scraperStatus
      setStatus(s)
      setLog(s.logs?.length ? s.logs : ['Reseeding started — connecting to Gamesheet API...'])
      startPolling()
    } catch (e) {
      const msg = `Failed to start: ${e.message}`
      setStatus({ running: false, success: false, message: msg, step: 0, logs: [msg], error: e.message })
      setLog([msg])
    }
  }

  const isRunning     = !!status?.running
  const isDone        = !!(status && !status.running && log.length > 0)
  const succeeded     = isDone && !!status.success
  const hasFailed     = isDone && !succeeded
  const isAccessError = hasFailed && /403|401|forbidden|access.?denied|unauthorized/i
                          .test((status?.error || '') + ' ' + (status?.message || ''))

  return (
    <div className="max-w-2xl mx-auto">
      {/* keyframe for indeterminate progress bar */}
      <style>{`@keyframes scraperSlide{0%{transform:translateX(-150%)}100%{transform:translateX(400%)}}`}</style>

      <h1 className="text-2xl font-bold text-white mb-1">Reseed Database</h1>
      <p className="text-gray-400 text-sm mb-6">
        Pulls the latest data from Gamesheet (teams, players, standings) and writes it into the local database.
        Safe to re-run at any time — existing records are updated, missing records are added, and nothing is deleted.
      </p>

      {/* Action row */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`px-6 py-3 rounded font-semibold text-white transition
            ${isRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 cursor-pointer'}`}
        >
          {isRunning ? 'Reseeding...' : 'Reseed Database'}
        </button>

        {status && (
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm
            ${isRunning ? 'bg-yellow-500/20 text-yellow-300'
              : succeeded ? 'bg-green-500/20 text-green-300'
              : isDone    ? 'bg-red-500/20 text-red-300'
              : 'bg-gray-700 text-gray-300'}`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0
              ${isRunning ? 'bg-yellow-400 animate-pulse'
                : succeeded ? 'bg-green-400'
                : isDone    ? 'bg-red-400'
                : 'bg-gray-400'}`}
            />
            {isRunning ? 'Running' : succeeded ? 'Complete' : isDone ? 'Failed' : 'Idle'}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {(isRunning || isDone) && (
        <div className="w-full mb-3">
          <div style={{ width: '100%', height: '6px', backgroundColor: '#374151', borderRadius: '3px', overflow: 'hidden' }}>
            {isRunning ? (
              <div style={{
                width: '35%', height: '100%',
                backgroundColor: '#facc15',
                borderRadius: '3px',
                animation: 'scraperSlide 1.8s ease-in-out infinite',
              }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                backgroundColor: succeeded ? '#22c55e' : '#ef4444',
                borderRadius: '3px',
              }} />
            )}
          </div>
          {isRunning && (status?.step ?? 0) > 0 && (
            <p className="text-yellow-300 text-xs mt-1">
              Step {status.step}{status.message ? ` — ${status.message}` : ''}
            </p>
          )}
          {isRunning && (
            <p className="text-gray-500 text-xs mt-1">Polling for updates every 20 s…</p>
          )}
        </div>
      )}

      {/* Access / auth error alert */}
      {isAccessError && (
        <div className="bg-orange-900/40 border border-orange-500/50 rounded p-4 mb-4">
          <p className="text-orange-300 font-semibold text-sm mb-1">
            Gamesheet access may have changed
          </p>
          <p className="text-orange-200 text-sm">
            The scraper received a 403 / 401 response. This happens when API credentials expire or
            Gamesheet changes their authentication. Update the scraper credentials or contact Gamesheet support.
          </p>
        </div>
      )}

      {/* Log output */}
      {log.length > 0 && (
        <div className="bg-[#0d1b2a] border border-gray-700 rounded p-4 font-mono text-xs text-gray-300 max-h-64 overflow-y-auto mb-4">
          {log.map((line, i) => (
            <div key={i} className={`mb-1 ${line.startsWith('[ERR]') ? 'text-red-400' : ''}`}>
              <span className="text-gray-500 mr-2 select-none">{String(i + 1).padStart(2, '0')}</span>
              {line}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Final status message */}
      {isDone && (
        <p className={`text-sm mb-4 ${succeeded ? 'text-green-400' : 'text-red-400'}`}>
          {status.message}
        </p>
      )}

      {/* Detailed error output (full stderr) */}
      {hasFailed && status?.error && (
        <div className="bg-red-950/40 border border-red-700/40 rounded p-4 mb-4">
          <p className="text-red-400 font-semibold text-sm mb-2">Scraper Error Details</p>
          <pre className="text-red-300 text-xs overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
            {status.error}
          </pre>
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 bg-[#0d1b2a] border border-gray-700 rounded p-4 text-sm text-gray-400">
        <p className="font-semibold text-gray-300 mb-2">What reseeding does:</p>
        <ul className="list-disc list-inside space-y-1 mb-3">
          <li>Searches Gamesheet for all matching WEHA / WCHL / Gunnison seasons</li>
          <li>Adds any leagues, divisions, seasons, and teams not yet in the database</li>
          <li>Updates existing team standings (wins, losses, ties)</li>
          <li>Adds or refreshes player stats (goals, assists, games played)</li>
          <li>Adds or refreshes goalie stats (GAA, games played)</li>
        </ul>
        <p className="font-semibold text-gray-300 mb-1">Safe to re-run:</p>
        <p>
          Re-running will never duplicate or delete existing data — it only fills in gaps and updates stale stats.
          Run it at the start of each season or after new games have been played.
        </p>
        <p className="mt-3 text-gray-500">
          Requires the Python virtual environment at <code className="text-white">.venv/</code> in the project root
          with dependencies installed from <code className="text-white">scraper/requirements.txt</code>.
        </p>
      </div>
    </div>
  )
}
