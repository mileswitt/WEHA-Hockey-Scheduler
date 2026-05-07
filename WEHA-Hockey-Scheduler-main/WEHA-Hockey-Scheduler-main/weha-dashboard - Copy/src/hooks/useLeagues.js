// Custom hook that manages the three-level reference data hierarchy:
//   League → Division → Season
//
// Usage pattern:
//   1. Admin uploads four reference CSV files (league, division, season, team).
//   2. loadFromFiles() parses them all client-side and populates state.
//   3. The Upload and GenerateTeams pages use the resulting lists to populate
//      dropdowns without needing a network call.
//   4. Admins can also create leagues/divisions on the fly via addLeague() and
//      addDivision() — these get temporary "custom-{timestamp}" IDs that get
//      replaced by real DB IDs when the teams are eventually saved.
import { useState } from 'react'

// Minimal CSV parser that handles quoted fields containing commas.
// Returns an array of objects keyed by the header row.
function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += char }
    }
    values.push(current.trim())
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').replace(/^"|"$/g, '')]))
  })
}

export default function useLeagues() {
  const [leagues,   setLeagues]   = useState([])
  const [divisions, setDivisions] = useState([])
  const [seasons,   setSeasons]   = useState([])
  const [loaded,    setLoaded]    = useState(false)
  const [error,     setError]     = useState(null)

  // Read all four files in parallel, parse them, and build normalized lists.
  // leagueMap is built first so each division can carry its parent league name.
  const loadFromFiles = async (leagueFile, divisionFile, seasonFile, teamFile) => {
    try {
      const readFile = (file) => new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = e => res(e.target.result)
        reader.onerror = () => rej(new Error(`Failed to read ${file.name}`))
        reader.readAsText(file)
      })

      const [leagueText, divisionText, seasonText] = await Promise.all([
        readFile(leagueFile),
        readFile(divisionFile),
        readFile(seasonFile),
        readFile(teamFile),
      ])

      const leagueRows   = parseCSV(leagueText)
      const divisionRows = parseCSV(divisionText)
      const seasonRows   = parseCSV(seasonText)
      // Map LeagueID → Name so divisions can resolve their parent name
      const leagueMap    = Object.fromEntries(leagueRows.map(l => [l.LeagueID, l.Name]))

      const leagueList = leagueRows.map(l => ({
        id:       l.LeagueID,
        name:     l.Name,
        custom:   false,
      }))

      const divisionList = divisionRows.map(d => ({
        id:          d.DivisionID,
        leagueID:    d.LeagueID,
        name:        d.Name,
        leagueName:  leagueMap[d.LeagueID] || 'Unknown',
        custom:      false,
      }))

      const seasonList = seasonRows.map(s => ({
        id:       s.SeasonID,
        leagueID: s.LeagueID,
        name:     s.Name,
      }))

      setLeagues(leagueList)
      setDivisions(divisionList)
      setSeasons(seasonList)
      setLoaded(true)
      setError(null)

      return { leagues: leagueList, divisions: divisionList, seasons: seasonList }
    } catch (e) {
      setError(`Failed to parse reference CSVs: ${e.message}`)
      return null
    }
  }

  // Add a custom league with a temporary local ID (won't exist in DB yet).
  // The ★ marker in the UI indicates custom entries so admins know which ones
  // need to be created on the server.
  const addLeague = (name) => {
    const id = `custom-${Date.now()}`
    const newLeague = { id, name, custom: true }
    setLeagues(prev => [...prev, newLeague])
    return newLeague
  }

  // Add a custom division under an existing or custom league.
  const addDivision = (name, leagueID, leagueName) => {
    const id = `custom-${Date.now()}`
    const newDivision = { id, leagueID, name, leagueName, custom: true }
    setDivisions(prev => [...prev, newDivision])
    return newDivision
  }

  // Returns only the divisions that belong to a given league.
  // String comparison handles mixed numeric/string IDs from CSV vs custom entries.
  const getDivisionsForLeague = (leagueID) =>
    divisions.filter(d => String(d.leagueID) === String(leagueID))

  // Returns the division's most recent season (highest SeasonID) so the upload
  // form can pre-select a sensible default.
  const getLatestSeasonForLeague = (leagueID) => {
    const leagueSeasons = seasons
      .filter(s => String(s.leagueID) === String(leagueID))
      .sort((a, b) => b.id - a.id)
    return leagueSeasons[0] || null
  }

  return {
    leagues,
    divisions,
    seasons,
    loaded,
    error,
    loadFromFiles,
    addLeague,
    addDivision,
    getDivisionsForLeague,
    getLatestSeasonForLeague,
  }
}
