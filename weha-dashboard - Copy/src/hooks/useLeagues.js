import { useState } from 'react'

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

  // Add a custom league — generates a temporary ID
  const addLeague = (name) => {
    const id = `custom-${Date.now()}`
    const newLeague = { id, name, custom: true }
    setLeagues(prev => [...prev, newLeague])
    return newLeague
  }

  // Add a custom division under a league
  const addDivision = (name, leagueID, leagueName) => {
    const id = `custom-${Date.now()}`
    const newDivision = { id, leagueID, name, leagueName, custom: true }
    setDivisions(prev => [...prev, newDivision])
    return newDivision
  }

  const getDivisionsForLeague = (leagueID) =>
    divisions.filter(d => String(d.leagueID) === String(leagueID))

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