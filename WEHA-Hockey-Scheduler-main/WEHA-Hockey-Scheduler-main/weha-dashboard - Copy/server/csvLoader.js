import { parse } from 'csv-parse/sync'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Parse a CSV buffer or file path into array of objects
function parseCSV(input) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input)
  return parse(buffer, { columns: true, skip_empty_lines: true, trim: true })
}

// Clean goalie tags from names like "PETERSON (GOALIE)" -> "PETERSON"
function cleanName(name) {
  return name.replace(/\s*\(.*?\)/g, '').trim()
}

// Detect if a player is a goalie from position field or name
function isGoalie(position, firstName, lastName) {
  if (position === 'G') return true
  const fullName = `${firstName} ${lastName}`.toLowerCase()
  return /goalie/.test(fullName)
}

// Parse float safely, return fallback if NULL or empty
function safeFloat(val, fallback = 0) {
  if (!val || val === 'NULL' || val === '') return fallback
  const n = parseFloat(val)
  return isNaN(n) ? fallback : n
}

// Compute skill rating for a field player: points per game
function fieldPlayerSkill(goals, assists, gamesPlayed) {
  const g = safeFloat(goals)
  const a = safeFloat(assists)
  const gp = safeFloat(gamesPlayed, 1)
  return gp > 0 ? Math.round(((g + a) / gp) * 1000) / 1000 : 0
}

// Compute skill rating for a goalie: 10 - GAA (lower GAA = better goalie)
// If no GAA data, default to 5.0 (average)
function goalieSkill(gaa) {
  const g = safeFloat(gaa, null)
  if (g === null) return 5.0
  return Math.max(0, Math.round((10 - g) * 100) / 100)
}

// Load and join all reference CSVs from the data directory
// Returns a lookup object for use in player profile building
function loadReferenceTables(dataDir) {
  const league   = parseCSV(path.join(dataDir, 'league.csv'))
  const season   = parseCSV(path.join(dataDir, 'season.csv'))
  const division = parseCSV(path.join(dataDir, 'division.csv'))
  const team     = parseCSV(path.join(dataDir, 'team.csv'))

  const teamMap     = Object.fromEntries(team.map(t => [t.TeamID, t]))
  const divMap      = Object.fromEntries(division.map(d => [d.DivisionID, d]))
  const seasonMap   = Object.fromEntries(season.map(s => [s.SeasonID, s]))
  const leagueMap   = Object.fromEntries(league.map(l => [l.LeagueID, l]))

  return { teamMap, divMap, seasonMap, leagueMap }
}

// Build a full player profile from the player CSV upload + player_team join table
// playerCSVBuffer: the uploaded player CSV
// playerTeamCSVBuffer: the uploaded player_team CSV
// refs: the reference table lookups from loadReferenceTables()
// targetSeasonID: the season to pull players from (most recent by default)
export function buildPlayerProfiles(playerCSVBuffer, playerTeamCSVBuffer, refs, targetSeasonID) {
  const { teamMap, divMap } = refs

  // Parse uploaded CSVs
  let players, playerTeams
  try {
    players = parseCSV(playerCSVBuffer)
  } catch (e) {
    throw new Error(`Could not parse player CSV: ${e.message}`)
  }
  try {
    playerTeams = parseCSV(playerTeamCSVBuffer)
  } catch (e) {
    throw new Error(`Could not parse player_team CSV: ${e.message}`)
  }

  if (players.length === 0) throw new Error('Player CSV is empty.')
  if (playerTeams.length === 0) throw new Error('Player_team CSV is empty.')

  // Validate columns
  const requiredPlayerCols = ['PlayerID', 'FirstName', 'LastName', 'Position', 'Goals', 'Assists', 'GamesPlayed', 'Gaa']
  const requiredPTCols = ['PlayerID', 'TeamID', 'SeasonID']
  const missingPlayer = requiredPlayerCols.filter(c => !Object.keys(players[0]).includes(c))
  const missingPT = requiredPTCols.filter(c => !Object.keys(playerTeams[0]).includes(c))
  if (missingPlayer.length) throw new Error(`Player CSV missing columns: ${missingPlayer.join(', ')}`)
  if (missingPT.length) throw new Error(`Player_team CSV missing columns: ${missingPT.join(', ')}`)

  // Build player lookup map
  const playerMap = Object.fromEntries(players.map(p => [p.PlayerID, p]))

  // Filter player_team to target season only
  const seasonRecords = targetSeasonID
    ? playerTeams.filter(pt => pt.SeasonID === String(targetSeasonID))
    : playerTeams

  if (seasonRecords.length === 0) {
    throw new Error(`No players found for season ID ${targetSeasonID}.`)
  }

  // Build profiles — one per PlayerID per team in this season
  // If a player appears multiple times (multiple teams), take the most recent record
  const seen = new Map()
  const profiles = []

  for (const pt of seasonRecords) {
    const p = playerMap[pt.PlayerID]
    if (!p) continue

    const team = teamMap[pt.TeamID] || {}
    const div  = divMap[team.DivisionID] || {}

    const firstName = cleanName(p.FirstName || '')
    const lastName  = cleanName(p.LastName || '')
    const fullName  = `${firstName} ${lastName}`.trim()

    const goalie = isGoalie(p.Position, p.FirstName || '', p.LastName || '')
    const skill  = goalie
      ? goalieSkill(p.Gaa)
      : fieldPlayerSkill(p.Goals, p.Assists, p.GamesPlayed)

    // Skip placeholder rows like "SUB GOALIE" or "NO GOALIE"
    const lowerFirst = (p.FirstName || '').toLowerCase()
    const lowerLast  = (p.LastName || '').toLowerCase()
    if (['sub', 'no'].includes(lowerFirst) && lowerLast === 'goalie') continue

    const profile = {
      playerID:    p.PlayerID,
      name:        fullName,
      position:    goalie ? 'G' : (p.Position === 'NULL' ? 'F' : p.Position),
      isGoalie:    goalie,
      division:    div.Name || 'Unknown',
      divisionID:  team.DivisionID || null,
      teamName:    team.Name || 'Unknown',
      teamID:      pt.TeamID,
      skill,
      gaa:         goalie ? safeFloat(p.Gaa, null) : null,
      goals:       safeFloat(p.Goals),
      assists:     safeFloat(p.Assists),
      gamesPlayed: safeFloat(p.GamesPlayed, 1),
    }

    // Deduplicate — keep last occurrence per player per division
    const key = `${p.PlayerID}-${div.Name}`
    seen.set(key, profile)
  }

  for (const profile of seen.values()) {
    profiles.push(profile)
  }

  if (profiles.length === 0) throw new Error('No valid players found after processing.')

  return profiles
}

// Load players from a simple uploaded CSV (legacy path — used when no join tables uploaded)
export function loadPlayersFromCSV(buffer) {
  let records
  try {
    records = parseCSV(buffer)
  } catch (e) {
    throw new Error(`Could not parse CSV: ${e.message}`)
  }

  if (records.length === 0) throw new Error('CSV file is empty.')

  const requiredCols = ['First', 'Last', 'YEARS PLAYED']
  const missing = requiredCols.filter(c => !Object.keys(records[0]).includes(c))
  if (missing.length) throw new Error(`CSV missing required columns: ${missing.join(', ')}`)

  const players = records
    .map(row => ({
      name: `${(row['First'] || '').trim()} ${(row['Last'] || '').trim()}`.trim(),
      experience: parseExperience(row['YEARS PLAYED']),
      isGoalie: false,
      skill: parseExperience(row['YEARS PLAYED']),
      position: 'F',
    }))
    .filter(p => p.name !== '')

  if (players.length === 0) throw new Error('No valid players found in the CSV.')
  return players
}

function parseExperience(val) {
  if (!val || val.trim() === '') return 0
  const match = val.toString().match(/\d+/)
  return match ? parseInt(match[0]) : 0
}

// Get all available leagues and divisions from reference CSVs
export function getLeaguesAndDivisions(dataDir) {
  try {
    const { teamMap, divMap, seasonMap, leagueMap } = loadReferenceTables(dataDir)
    const league = parseCSV(path.join(dataDir, 'league.csv'))
    const division = parseCSV(path.join(dataDir, 'division.csv'))

    const leagueList = league.map(l => ({
      id: l.LeagueID,
      name: l.Name,
    }))

    const divisionList = division.map(d => ({
      id: d.DivisionID,
      leagueID: d.LeagueID,
      name: d.Name,
      leagueName: leagueMap[d.LeagueID]?.Name || 'Unknown',
    }))

    return { leagues: leagueList, divisions: divisionList }
  } catch (e) {
    return { leagues: [], divisions: [] }
  }
}

export { loadReferenceTables, parseCSV }

// ─── DB-backed helpers ───────────────────────────────────────────────────────

// Returns the same shape as loadReferenceTables() but reads from MySQL.
// Falls back to CSV if the DB has no data.
export async function loadReferenceTablesFromDb(dataDir) {
  try {
    const db = getDb()
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM League')
    if (!n) return loadReferenceTables(dataDir)

    const [teams]   = await db.query('SELECT * FROM Team')
    const [divs]    = await db.query('SELECT * FROM Division')
    const [seasons] = await db.query('SELECT * FROM Season')
    const [leagues] = await db.query('SELECT * FROM League')

    return {
      teamMap:   Object.fromEntries(teams.map(t   => [t.TeamID,     t])),
      divMap:    Object.fromEntries(divs.map(d    => [d.DivisionID, d])),
      seasonMap: Object.fromEntries(seasons.map(s => [s.SeasonID,   s])),
      leagueMap: Object.fromEntries(leagues.map(l => [l.LeagueID,   l])),
    }
  } catch {
    return loadReferenceTables(dataDir)
  }
}

// Returns { leagues, divisions, seasons } from MySQL.
// Falls back to CSV if the DB has no data.
export async function getLeaguesAndDivisionsFromDb(dataDir) {
  try {
    const db = getDb()
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM League')
    if (!n) {
      const csv     = getLeaguesAndDivisions(dataDir)
      const seasons = parseCSV(path.join(dataDir, 'season.csv'))
      return { ...csv, seasons: seasons.map(s => ({ id: s.SeasonID, leagueID: s.LeagueID, name: s.Name })) }
    }

    const [leagues]   = await db.query('SELECT LeagueID, Name FROM League')
    const [divisions] = await db.query(`
      SELECT d.DivisionID, d.LeagueID, d.Name, l.Name AS LeagueName
      FROM Division d JOIN League l ON d.LeagueID = l.LeagueID
    `)
    const [seasons] = await db.query('SELECT SeasonID, LeagueID, Name FROM Season')

    return {
      leagues:   leagues.map(l => ({ id: l.LeagueID, name: l.Name })),
      divisions: divisions.map(d => ({
        id:         d.DivisionID,
        leagueID:   d.LeagueID,
        name:       d.Name,
        leagueName: d.LeagueName,
      })),
      seasons: seasons.map(s => ({ id: s.SeasonID, leagueID: s.LeagueID, name: s.Name })),
    }
  } catch {
    return getLeaguesAndDivisions(dataDir)
  }
}

// Shared query builder for player rows from the DB.
async function queryPlayerRows(seasonIDs) {
  const db = getDb()
  let query = `
    SELECT
      p.PlayerID, p.FirstName, p.LastName, p.Position,
      p.Goals, p.Assists, p.GamesPlayed, p.Gaa,
      pt.TeamID, pt.SeasonID,
      t.Name   AS TeamName,  t.DivisionID,
      d.Name   AS DivName,
      l.LeagueID, l.Name AS LeagueName
    FROM PlayerTeam pt
    JOIN Player   p ON p.PlayerID   = pt.PlayerID
    JOIN Team     t ON t.TeamID     = pt.TeamID
    JOIN Division d ON d.DivisionID = t.DivisionID
    JOIN League   l ON l.LeagueID   = t.LeagueID
  `
  const params = []
  if (seasonIDs && seasonIDs.length > 0) {
    query += ` WHERE pt.SeasonID IN (?)`
    params.push(seasonIDs.map(Number))
  }
  query += ' ORDER BY pt.SeasonID DESC'
  const [rows] = await db.query(query, params)
  return rows
}

// Build player profiles from the DB for a single season (or all seasons if seasonID is null).
// Returns one profile per player per league using their most-recent season's stats.
export async function buildPlayerProfilesFromDb(seasonID) {
  const rows = await queryPlayerRows(seasonID ? [seasonID] : null)

  if (rows.length === 0) {
    throw new Error(seasonID ? `No players found for season ID ${seasonID}.` : 'No players found in database.')
  }

  const seen = new Map()
  for (const row of rows) {
    const key = `${row.PlayerID}-${row.LeagueID}`
    if (seen.has(key)) continue

    const firstName = cleanName(row.FirstName || '')
    const lastName  = cleanName(row.LastName  || '')
    const fullName  = `${firstName} ${lastName}`.trim()
    const lowerFirst = (row.FirstName || '').toLowerCase()
    const lowerLast  = (row.LastName  || '').toLowerCase()
    if (['sub', 'no'].includes(lowerFirst) && lowerLast === 'goalie') continue

    const goalie = isGoalie(row.Position, row.FirstName || '', row.LastName || '')
    const skill  = goalie ? goalieSkill(row.Gaa) : fieldPlayerSkill(row.Goals, row.Assists, row.GamesPlayed)

    seen.set(key, {
      playerID:    row.PlayerID,
      name:        fullName,
      position:    goalie ? 'G' : (row.Position === 'NULL' || !row.Position ? 'F' : row.Position),
      isGoalie:    goalie,
      division:    row.DivName    || 'Unknown',
      divisionID:  row.DivisionID || null,
      teamName:    row.TeamName   || 'Unknown',
      teamID:      row.TeamID,
      leagueName:  row.LeagueName || 'Unknown',
      leagueID:    row.LeagueID,
      skill,
      seasonsPlayed: 1,
      gaa:         goalie ? safeFloat(row.Gaa, null) : null,
      goals:       safeFloat(row.Goals),
      assists:     safeFloat(row.Assists),
      gamesPlayed: safeFloat(row.GamesPlayed, 1),
    })
  }

  const profiles = [...seen.values()]
  if (profiles.length === 0) throw new Error('No valid players found after processing.')
  return profiles
}

// Build player profiles across MULTIPLE seasons, averaging stats.
// For each player-league combo:
//   - Field players: average PPG (points-per-game) across all seasons they appear in
//   - Goalies: average GAA across seasons
//   - Experience multiplier: +5% skill per additional season played (2 seasons = +5%, 3 = +10%, etc.)
// This gives long-tenured players a fair bump to reflect their experience.
export async function buildPlayerProfilesMultiSeason(seasonIDs) {
  if (!seasonIDs || seasonIDs.length === 0) return buildPlayerProfilesFromDb(null)
  if (seasonIDs.length === 1)               return buildPlayerProfilesFromDb(seasonIDs[0])

  const rows = await queryPlayerRows(seasonIDs)
  if (rows.length === 0) throw new Error('No players found for the selected seasons.')

  // Group all rows by playerID + leagueID
  const groups = new Map()
  for (const row of rows) {
    const lowerFirst = (row.FirstName || '').toLowerCase()
    const lowerLast  = (row.LastName  || '').toLowerCase()
    if (['sub', 'no'].includes(lowerFirst) && lowerLast === 'goalie') continue

    const key = `${row.PlayerID}-${row.LeagueID}`
    if (!groups.has(key)) groups.set(key, { baseRow: row, rows: [] })
    groups.get(key).rows.push(row)
  }

  const profiles = []
  for (const { baseRow, rows: playerRows } of groups.values()) {
    const firstName = cleanName(baseRow.FirstName || '')
    const lastName  = cleanName(baseRow.LastName  || '')
    const fullName  = `${firstName} ${lastName}`.trim()
    const goalie    = isGoalie(baseRow.Position, baseRow.FirstName || '', baseRow.LastName || '')

    // Count distinct seasons this player appeared in (within the selected set)
    const uniqueSeasons = new Set(playerRows.map(r => r.SeasonID)).size

    // Experience multiplier: +5% per additional season beyond the first
    const expMultiplier = 1 + 0.05 * (uniqueSeasons - 1)

    let skill, avgGoals, avgAssists, avgGP, avgGaa

    if (goalie) {
      const gaaVals = playerRows.map(r => safeFloat(r.Gaa, null)).filter(g => g !== null)
      avgGaa = gaaVals.length > 0 ? gaaVals.reduce((a, b) => a + b, 0) / gaaVals.length : null
      // For goalies: lower GAA = better; experience multiplier improves skill (reduces effective GAA slightly)
      const baseSkill = goalieSkill(avgGaa)
      skill = Math.round(baseSkill * expMultiplier * 100) / 100
    } else {
      // Average PPG across each season the player appeared in
      const ppgPerSeason = playerRows.map(r => {
        const gp  = safeFloat(r.GamesPlayed, 1)
        const pts = safeFloat(r.Goals) + safeFloat(r.Assists)
        return gp > 0 ? pts / gp : 0
      })
      const avgPPG   = ppgPerSeason.reduce((a, b) => a + b, 0) / ppgPerSeason.length
      avgGoals   = playerRows.reduce((s, r) => s + safeFloat(r.Goals),       0) / playerRows.length
      avgAssists = playerRows.reduce((s, r) => s + safeFloat(r.Assists),     0) / playerRows.length
      avgGP      = playerRows.reduce((s, r) => s + safeFloat(r.GamesPlayed, 1), 0) / playerRows.length
      skill      = Math.round(avgPPG * expMultiplier * 1000) / 1000
    }

    profiles.push({
      playerID:     baseRow.PlayerID,
      name:         fullName,
      position:     goalie ? 'G' : (baseRow.Position === 'NULL' || !baseRow.Position ? 'F' : baseRow.Position),
      isGoalie:     goalie,
      division:     baseRow.DivName    || 'Unknown',
      divisionID:   baseRow.DivisionID || null,
      teamName:     baseRow.TeamName   || 'Unknown',
      teamID:       baseRow.TeamID,
      leagueName:   baseRow.LeagueName || 'Unknown',
      leagueID:     baseRow.LeagueID,
      skill,
      seasonsPlayed: uniqueSeasons,
      gaa:          goalie ? (avgGaa != null ? Math.round(avgGaa * 100) / 100 : null) : null,
      goals:        avgGoals   != null ? Math.round(avgGoals   * 10) / 10 : safeFloat(baseRow.Goals),
      assists:      avgAssists != null ? Math.round(avgAssists * 10) / 10 : safeFloat(baseRow.Assists),
      gamesPlayed:  avgGP      != null ? Math.round(avgGP      * 10) / 10 : safeFloat(baseRow.GamesPlayed, 1),
    })
  }

  if (profiles.length === 0) throw new Error('No valid players found after processing.')
  return profiles
}