import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import {
  loadPlayersFromCSV,
  buildPlayerProfiles,
  buildPlayerProfilesFromDb,
  buildPlayerProfilesMultiSeason,
  loadReferenceTables,
  getLeaguesAndDivisionsFromDb,
} from './csvLoader.js'
import { balanceTeams, formatTeamsResponse } from './teamFairness.js'
import { getDb, withTransaction, initSchema } from './db.js'
import { generateRoundRobin, assignGameDates, seededRoundRobin } from './roundRobin.js'

const __dirname    = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR     = path.join(__dirname, 'data')
const SCRAPER_DIR  = path.join(__dirname, '..', 'scraper')
const PYTHON_PATH  = process.env.PYTHON_PATH
  ? path.resolve(process.env.PYTHON_PATH)
  : path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe')
const MAIN_PY_PATH = path.join(SCRAPER_DIR, 'main.py')

// ─── External data API ────────────────────────────────────────────────────────
// Read-only proxy to the hosted WEHA data source. Routes below expose these
// to the frontend without leaking the upstream URL.
const DATA_API = 'https://weha-hockey-scheduler-data-demo.onrender.com/api'

async function fetchExternal(path) {
  const res = await fetch(`${DATA_API}/${path}`)
  if (!res.ok) throw new Error(`External API error on /${path}: ${res.status}`)
  return res.json()
}

const getExternalTeams     = () => fetchExternal('getTeams')
const getExternalDivisions = () => fetchExternal('getDivisions')
const getExternalSeasons   = () => fetchExternal('getSeasons')
const getExternalLeagues   = () => fetchExternal('getLeagues')

const JWT_SECRET   = process.env.JWT_SECRET_KEY
const TOKEN_HEADER = process.env.TOKEN_HEADER_KEY || 'auth-token'

// JWT middleware — attach to any route that requires admin auth
function requireAuth(req, res, next) {
  try {
    const token = req.header(TOKEN_HEADER)
    if (!token) return res.status(401).json({ message: 'Access Denied: No token provided' })
    jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ message: 'Access Denied: Invalid or expired token' })
  }
}

// Tracks web scraper status across requests
let scraperStatus = {
  running:   false,
  success:   false,
  message:   '',
  step:      0,       // incremented for each stdout line received
  logs:      [],      // all stdout lines + flagged stderr lines
  error:     '',      // full stderr on failure, for detailed client display
  startedAt: null,
}

const app    = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'public')))

// --- POST /api/login ---
// Verifies admin credentials against the DB and returns a signed JWT token.
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' })
  }
  const db = getDb()
  const [[admin]] = await db.query('SELECT AdminID, PasswordHash FROM Admin WHERE Email = ?', [username])
  if (!admin) return res.status(401).json({ message: 'Invalid username or password' })

  const match = await bcrypt.compare(password, admin.PasswordHash)
  if (!match)  return res.status(401).json({ message: 'Invalid username or password' })

  const token = jwt.sign(
    { time: Date(), adminId: admin.AdminID },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
  return res.status(200).json({ message: 'Login successful', token })
})

// --- POST /api/logout ---
app.post('/api/logout', (_req, res) => {
  return res.status(200).json({ message: 'User Logged Out' })
})

// --- POST /api/refresh-token ---
// Accepts a valid (non-expired) JWT and returns a fresh one with a new 1-hour expiry.
app.post('/api/refresh-token', requireAuth, (req, res) => {
  try {
    const token   = req.header(TOKEN_HEADER)
    const decoded = jwt.verify(token, JWT_SECRET)
    const newToken = jwt.sign(
      { time: Date(), adminId: decoded.adminId },
      JWT_SECRET,
      { expiresIn: '1h' }
    )
    return res.json({ token: newToken })
  } catch {
    return res.status(401).json({ message: 'Could not refresh token.' })
  }
})

// --- GET /api/leagues-divisions ---
// Returns all leagues, divisions, and seasons (DB-first, CSV fallback)
app.get('/api/leagues-divisions', async (_req, res) => {
  try {
    const result = await getLeaguesAndDivisionsFromDb(DATA_DIR)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: `Could not load reference data: ${e.message}` })
  }
})

// ─── External API proxy routes ────────────────────────────────────────────────
// These forward requests to the hosted WEHA data source so the frontend never
// needs to know the upstream URL. Responses are passed through as-is.

app.get('/api/external/teams', async (_req, res) => {
  try { res.json(await getExternalTeams()) }
  catch (e) { res.status(502).json({ error: e.message }) }
})

app.get('/api/external/divisions', async (_req, res) => {
  try { res.json(await getExternalDivisions()) }
  catch (e) { res.status(502).json({ error: e.message }) }
})

app.get('/api/external/seasons', async (_req, res) => {
  try { res.json(await getExternalSeasons()) }
  catch (e) { res.status(502).json({ error: e.message }) }
})

app.get('/api/external/leagues', async (_req, res) => {
  try { res.json(await getExternalLeagues()) }
  catch (e) { res.status(502).json({ error: e.message }) }
})

// --- POST /api/generate-teams/from-db ---
// --- GET /api/player-count ---
// Returns how many players match the given filters and how many teams of teamSize can be formed.
// Query params: league_name, division_name (optional), season_ids (comma-separated, optional), team_size (optional, default 6)
app.get('/api/player-count', async (req, res) => {
  const teamSize  = parseInt(req.query.team_size) || 6
  const seasonIDs = req.query.season_ids
    ? req.query.season_ids.split(',').map(s => s.trim()).filter(Boolean)
    : req.query.season_id ? [req.query.season_id] : []
  try {
    const profiles = await buildPlayerProfilesMultiSeason(seasonIDs)
    const count    = profiles.length
    const numTeams = Math.floor(count / teamSize)
    res.json({ count, numTeams, teamSize, remainder: count % teamSize })
  } catch {
    res.json({ count: 0, numTeams: 0, teamSize, remainder: 0 })
  }
})

// --- POST /api/generate-teams/from-db ---
// Generates balanced teams using player data already in the database.
// Body params: league_name, division_name (optional), season_ids (array or single season_id)
//   auto_size: true  → num_teams = floor(playerCount / team_size)
//   num_teams: N     → explicit team count (used when auto_size is false/absent)
//   team_size: N     → players per team when auto_size is true (default 6)
app.post('/api/generate-teams/from-db', async (req, res) => {
  const autoSize = req.body.auto_size === true || req.body.auto_size === 'true'
  const teamSize = parseInt(req.body.team_size) || 6

  const divisionName = req.body.division_name || null
  const leagueName   = req.body.league_name   || null

  // Accept season_ids array or fallback to single season_id
  const rawIDs = req.body.season_ids
  const seasonIDs = Array.isArray(rawIDs) ? rawIDs.filter(Boolean).map(String)
    : rawIDs ? [String(rawIDs)]
    : req.body.season_id ? [String(req.body.season_id)]
    : []

  let profiles
  try {
    profiles = await buildPlayerProfilesMultiSeason(seasonIDs)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  const filtered = profiles

  if (filtered.length === 0) {
    return res.status(400).json({
      error: 'No players found in the selected seasons.'
    })
  }

  let numTeams
  if (autoSize) {
    numTeams = Math.floor(filtered.length / teamSize)
    if (numTeams < 2) {
      return res.status(400).json({
        error: `Only ${filtered.length} players found — need at least ${teamSize * 2} to form 2 teams of ${teamSize}.`
      })
    }
  } else {
    numTeams = parseInt(req.body.num_teams)
    if (isNaN(numTeams) || numTeams < 2) {
      return res.status(400).json({ error: 'num_teams must be at least 2.' })
    }
    if (filtered.length < numTeams) {
      return res.status(400).json({
        error: `Not enough players (${filtered.length}) for ${numTeams} teams.`
      })
    }
  }

  // Sort by skill descending and split into exactly (numTeams × teamSize) assigned players.
  // The remainder become unassigned — each team gets exactly teamSize players.
  const sortedBySkill = [...filtered].sort((a, b) => b.skill - a.skill)
  const assignPool    = sortedBySkill.slice(0, numTeams * teamSize)
  const unassigned    = sortedBySkill.slice(numTeams * teamSize)

  let teams
  try {
    teams = balanceTeams(assignPool, numTeams)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  return res.json({
    teams:            formatTeamsResponse(teams),
    unassigned,
    num_teams:        numTeams,
    team_size:        teamSize,
    total_players:    filtered.length,
    players_assigned: assignPool.length,
    division:         divisionName,
    league:           leagueName,
    goalies_assigned: teams.filter(t => t.hasGoalie).length,
  })
})

// --- GET /api/data-quality ---
// Scans the player pool for a given filter set and returns a list of data issues.
// Same query params as /api/player-count: league_name, division_name, season_id
app.get('/api/data-quality', async (req, res) => {
  const { league_name, division_name, season_id } = req.query

  let profiles
  try {
    profiles = await buildPlayerProfilesFromDb(season_id || null)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  if (league_name)   profiles = profiles.filter(p => p.leagueName === league_name)
  if (division_name) profiles = profiles.filter(p => p.division   === division_name)

  const issues = []

  // 1. Duplicate display names — emit ONE grouped issue per shared name.
  //    Different PlayerIDs strongly implies different people, so severity is 'info' not 'warning'.
  const byName = new Map()
  for (const p of profiles) {
    const key = p.name.toLowerCase().trim()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(p)
  }
  for (const group of byName.values()) {
    if (group.length > 1) {
      const sortedIDs = group.map(p => p.playerID).sort((a, b) => a - b)
      issues.push({
        id:        `dup-${sortedIDs.join('-')}`,
        type:      'duplicate_name',
        severity:  'info',
        grouped:   true,
        players:   group,
        playerIDs: sortedIDs,
        name:      group[0].name,
        message:   `${group.length} players share this name (IDs: ${sortedIDs.join(', ')}). Because the IDs differ they are assumed to be different people, but double-check if that seems wrong.`,
      })
    }
  }

  // 2. Field players with no stats at all
  for (const p of profiles.filter(p => !p.isGoalie)) {
    if (!p.goals && !p.assists && (!p.gamesPlayed || p.gamesPlayed === 0)) {
      issues.push({
        playerID: p.playerID, name: p.name, profile: p,
        type: 'no_stats', severity: 'warning',
        message: 'No goals, assists, or games played recorded. Skill score will be 0.',
      })
    }
  }

  // 3. Goalies with no GAA
  for (const p of profiles.filter(p => p.isGoalie)) {
    if (p.gaa == null) {
      issues.push({
        playerID: p.playerID, name: p.name, profile: p,
        type: 'missing_gaa', severity: 'warning',
        message: 'No GAA recorded. Goalie skill will default to average (5.0).',
      })
    }
  }

  // 4. Missing or null position
  for (const p of profiles.filter(p => !p.isGoalie)) {
    if (!p.position || p.position === 'NULL') {
      issues.push({
        playerID: p.playerID, name: p.name, profile: p,
        type: 'missing_position', severity: 'info',
        message: 'No position recorded. Will be treated as a forward (F).',
      })
    }
  }

  // 5. Low sample size (1–2 GP with some recorded stats)
  for (const p of profiles.filter(p => !p.isGoalie)) {
    if (p.gamesPlayed > 0 && p.gamesPlayed < 3 && (p.goals > 0 || p.assists > 0)) {
      issues.push({
        playerID: p.playerID, name: p.name, profile: p,
        type: 'low_sample', severity: 'info',
        message: `Only ${p.gamesPlayed} game${p.gamesPlayed !== 1 ? 's' : ''} played. Stats may not reflect true skill.`,
      })
    }
  }

  // 6. Anomalous points-per-game (>4 ppg — likely data entry error)
  for (const p of profiles.filter(p => !p.isGoalie)) {
    if (p.gamesPlayed > 0) {
      const ppg = ((p.goals || 0) + (p.assists || 0)) / p.gamesPlayed
      if (ppg > 4) {
        issues.push({
          playerID: p.playerID, name: p.name, profile: p,
          type: 'anomalous_stats', severity: 'warning',
          message: `${ppg.toFixed(1)} points/game is unusually high. Verify goals (${p.goals}) and assists (${p.assists}) are correct.`,
        })
      }
    }
  }

  const warnings = issues.filter(i => i.severity === 'warning').length
  const infos    = issues.filter(i => i.severity === 'info').length

  res.json({
    total:    profiles.length,
    summary:  { warnings, infos, clean: profiles.length - new Set(issues.map(i => i.playerID)).size },
    issues,
  })
})

// --- PUT /api/player/:id ---
// Updates a player's editable stats in the database.
app.put('/api/player/:id', async (req, res) => {
  const playerID = parseInt(req.params.id)
  if (isNaN(playerID)) return res.status(400).json({ error: 'Invalid player ID.' })

  const { goals, assists, gamesPlayed, gaa, position } = req.body

  const db = getDb()
  const [[existing]] = await db.query('SELECT * FROM Player WHERE PlayerID = ?', [playerID])
  if (!existing) return res.status(404).json({ error: `Player ${playerID} not found.` })

  const updated = {
    Goals:       goals       !== undefined ? (goals       === '' ? null : Number(goals))       : existing.Goals,
    Assists:     assists     !== undefined ? (assists     === '' ? null : Number(assists))     : existing.Assists,
    GamesPlayed: gamesPlayed !== undefined ? (gamesPlayed === '' ? null : Number(gamesPlayed)) : existing.GamesPlayed,
    Gaa:         gaa         !== undefined ? (gaa         === '' ? null : Number(gaa))         : existing.Gaa,
    Position:    position    !== undefined ? (position    === '' ? null : position)            : existing.Position,
  }

  await db.query(
    'UPDATE Player SET Goals=?, Assists=?, GamesPlayed=?, Gaa=?, Position=? WHERE PlayerID=?',
    [updated.Goals, updated.Assists, updated.GamesPlayed, updated.Gaa, updated.Position, playerID]
  )

  const [[row]] = await db.query('SELECT * FROM Player WHERE PlayerID = ?', [playerID])
  res.json({ ok: true, player: row })
})

// --- POST /api/season ---
// Creates a new season record for the given league.
app.post('/api/season', async (req, res) => {
  const { name, leagueID } = req.body
  if (!name?.trim())  return res.status(400).json({ error: 'Season name is required.' })
  if (!leagueID)      return res.status(400).json({ error: 'League ID is required.' })

  const db = getDb()
  const [[league]] = await db.query('SELECT LeagueID FROM League WHERE LeagueID = ?', [Number(leagueID)])
  if (!league) return res.status(404).json({ error: 'League not found.' })

  const [[existing]] = await db.query('SELECT SeasonID FROM Season WHERE LeagueID = ? AND LOWER(Name) = LOWER(?)', [Number(leagueID), name.trim()])
  if (existing) return res.status(409).json({ error: `A season named "${name.trim()}" already exists for this league.` })

  const [[{ maxID }]] = await db.query('SELECT MAX(SeasonID) AS maxID FROM Season')
  const newID = (maxID || 0) + 1

  await db.query('INSERT INTO Season (SeasonID, LeagueID, Name) VALUES (?, ?, ?)', [newID, Number(leagueID), name.trim()])
  res.json({ ok: true, season: { id: newID, leagueID: Number(leagueID), name: name.trim() } })
})

// --- POST /api/league ---
app.post('/api/league', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'League name is required.' })

  const db = getDb()
  const [[existing]] = await db.query('SELECT LeagueID FROM League WHERE LOWER(Name) = LOWER(?)', [name.trim()])
  if (existing) return res.status(409).json({ error: `A league named "${name.trim()}" already exists.` })

  const [[{ maxID }]] = await db.query('SELECT MAX(LeagueID) AS maxID FROM League')
  const newID = (maxID || 0) + 1
  await db.query('INSERT INTO League (LeagueID, Name) VALUES (?, ?)', [newID, name.trim()])
  res.json({ ok: true, league: { id: newID, name: name.trim() } })
})

// --- POST /api/division ---
// Creates a new division under an existing league.
app.post('/api/division', async (req, res) => {
  const { name, leagueID } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Division name is required.' })
  if (!leagueID)     return res.status(400).json({ error: 'League ID is required.' })

  const db = getDb()
  const [[league]] = await db.query('SELECT LeagueID FROM League WHERE LeagueID = ?', [Number(leagueID)])
  if (!league) return res.status(404).json({ error: 'League not found.' })

  const [[existing]] = await db.query('SELECT DivisionID FROM Division WHERE LeagueID = ? AND LOWER(Name) = LOWER(?)', [Number(leagueID), name.trim()])
  if (existing) return res.status(409).json({ error: `A division named "${name.trim()}" already exists for this league.` })

  const [[{ maxID }]] = await db.query('SELECT MAX(DivisionID) AS maxID FROM Division')
  const newID = (maxID || 0) + 1

  await db.query('INSERT INTO Division (DivisionID, LeagueID, Name) VALUES (?, ?, ?)', [newID, Number(leagueID), name.trim()])
  res.json({ ok: true, division: { id: newID, leagueID: Number(leagueID), name: name.trim() } })
})

// --- POST /api/generate-teams/advanced ---
// Accepts: player.csv + player_team.csv uploads, seasonID, numTeams, divisionName
app.post('/api/generate-teams/advanced', upload.fields([
  { name: 'playerFile',     maxCount: 1 },
  { name: 'playerTeamFile', maxCount: 1 },
]), (req, res) => {
  if (!req.files?.playerFile)     return res.status(400).json({ error: 'player.csv is required.' })
  if (!req.files?.playerTeamFile) return res.status(400).json({ error: 'player_team.csv is required.' })

  const numTeams = parseInt(req.body.num_teams)
  if (isNaN(numTeams) || numTeams < 2) {
    return res.status(400).json({ error: 'num_teams must be at least 2.' })
  }

  const seasonID     = req.body.season_id     || null
  const divisionName = req.body.division_name || null
  const leagueName   = req.body.league_name   || null

  let refs
  try {
    refs = loadReferenceTables(DATA_DIR)
  } catch (e) {
    return res.status(500).json({ error: `Could not load reference tables: ${e.message}` })
  }

  let profiles
  try {
    profiles = buildPlayerProfiles(
      req.files.playerFile[0].buffer,
      req.files.playerTeamFile[0].buffer,
      refs,
      seasonID
    )
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  // Filter by division and optionally league
  let filtered = profiles
  if (divisionName) filtered = filtered.filter(p => p.division === divisionName)
  if (leagueName)   filtered = filtered.filter(p => p.leagueName === leagueName)

  if (filtered.length === 0) {
    return res.status(400).json({
      error: `No players found for${leagueName ? ` league "${leagueName}"` : ''}${divisionName ? ` division "${divisionName}"` : ''}.`
    })
  }
  if (filtered.length < numTeams) {
    return res.status(400).json({
      error: `Not enough players (${filtered.length}) for ${numTeams} teams.`
    })
  }

  let teams
  try {
    teams = balanceTeams(filtered, numTeams)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  return res.json({
    teams:            formatTeamsResponse(teams),
    num_teams:        numTeams,
    total_players:    filtered.length,
    division:         divisionName,
    league:           leagueName,
    goalies_assigned: teams.filter(t => t.hasGoalie).length,
  })
})

// --- POST /api/generate-teams (legacy simple CSV) ---
app.post('/api/generate-teams', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided.' })
  if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
    return res.status(400).json({ error: 'Only CSV files are supported.' })
  }

  const numTeams = parseInt(req.body.num_teams)
  if (isNaN(numTeams) || numTeams < 2) {
    return res.status(400).json({ error: 'num_teams must be at least 2.' })
  }

  let players
  try   { players = loadPlayersFromCSV(req.file.buffer) }
  catch (e) { return res.status(400).json({ error: e.message }) }

  let teams
  try   { teams = balanceTeams(players, numTeams) }
  catch (e) { return res.status(400).json({ error: e.message }) }

  return res.json({
    teams:         formatTeamsResponse(teams),
    num_teams:     numTeams,
    total_players: players.length,
  })
})

// --- POST /api/runWebScrape ---
// Launches the Python Scrapy scraper as a child process.
// Only one instance can run at a time — subsequent calls return current status.
// Requires a valid admin JWT token.
app.post('/api/runWebScrape', requireAuth, (_req, res) => {
  if (scraperStatus.running) {
    scraperStatus.message = 'Web scraper is currently running...'
    return res.json({ scraperStatus })
  }

  scraperStatus.running   = true
  scraperStatus.success   = false
  scraperStatus.message   = 'Starting web scraper...'
  scraperStatus.step      = 0
  scraperStatus.logs      = ['Starting web scraper...']
  scraperStatus.error     = ''
  scraperStatus.startedAt = new Date().toISOString()

  console.log(`Starting web scraper...`)
  console.log(`Python: ${PYTHON_PATH}`)
  console.log(`Script: ${MAIN_PY_PATH}`)

  res.json({ scraperStatus })

  const pythonProcess = spawn(PYTHON_PATH, ['-u', MAIN_PY_PATH], { cwd: SCRAPER_DIR })

  // Spawn error — e.g. python.exe not found at the configured path
  pythonProcess.on('error', err => {
    console.error(`[Scraper SPAWN ERROR] ${err.message}`)
    scraperStatus.running = false
    scraperStatus.success = false
    scraperStatus.error   = err.message
    scraperStatus.message = `Spawn Error: ${err.message}`
    scraperStatus.logs.push(`✗ Spawn failed: ${err.message}`)
  })

  pythonProcess.stdout.on('data', data => {
    const lines = data.toString().split('\n').map(l => l.trim()).filter(Boolean)
    lines.forEach(line => {
      console.log(`[Scraper] ${line}`)
      scraperStatus.logs.push(line)
      scraperStatus.step   += 1
      scraperStatus.message = line
    })
    // Cap log to last 500 lines so memory stays bounded
    if (scraperStatus.logs.length > 500) scraperStatus.logs = scraperStatus.logs.slice(-500)
  })

  // Buffer stderr for the final error report; also surface ERROR/CRITICAL lines
  // in real-time so the admin can see access/auth failures immediately.
  let stderrBuffer = ''
  pythonProcess.stderr.on('data', data => {
    const text = data.toString()
    stderrBuffer += text
    text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      if (/ERROR|CRITICAL|Exception|Traceback|403|401|Access|Denied|Forbidden/i.test(line)) {
        scraperStatus.logs.push(`[ERR] ${line}`)
      }
    })
  })

  pythonProcess.on('close', code => {
    scraperStatus.running = false
    if (code === 0) {
      scraperStatus.success = true
      scraperStatus.message = 'Web scraper finished successfully'
      scraperStatus.logs.push('✓ Reseeding completed successfully')
    } else {
      scraperStatus.success = false
      scraperStatus.error   = stderrBuffer.trim()
      scraperStatus.message = `Web scraper failed (exit code ${code})`
      scraperStatus.logs.push(`✗ Scraper exited with code ${code}`)
      if (stderrBuffer) console.error(`[Scraper STDERR] ${stderrBuffer}`)
    }
  })
})

// --- GET /api/webScrapeStatus ---
// Poll this endpoint to get the current scraper state.
app.get('/api/webScrapeStatus', (_req, res) => {
  res.json({ scraperStatus })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DRAFT TEAMS — generated-but-not-yet-saved teams (persist across page refreshes)
// ═══════════════════════════════════════════════════════════════════════════════

// --- GET /api/draft-teams ---
// Returns all draft teams structured as { leagueName: { divisionName: { teamKey: teamData } } }
// Matches the allTeams shape used by App.jsx so ScheduleManager can merge them directly.
app.get('/api/draft-teams', async (_req, res) => {
  const db = getDb()
  try {
    const [rows] = await db.query('SELECT LeagueName, DivisionName, TeamKey, TeamData FROM DraftTeam ORDER BY LeagueName, DivisionName, TeamKey')
    const result = {}
    for (const row of rows) {
      if (!result[row.LeagueName]) result[row.LeagueName] = {}
      if (!result[row.LeagueName][row.DivisionName]) result[row.LeagueName][row.DivisionName] = {}
      try { result[row.LeagueName][row.DivisionName][row.TeamKey] = JSON.parse(row.TeamData) }
      catch { /* skip malformed rows */ }
    }
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- POST /api/draft-teams ---
// Saves (or replaces) a full division's generated teams.
// Body: { leagueName, divisionName, teamMap: { teamKey: teamData, ... } }
app.post('/api/draft-teams', async (req, res) => {
  const { leagueName, divisionName, teamMap } = req.body
  if (!leagueName || !divisionName || !teamMap || typeof teamMap !== 'object') {
    return res.status(400).json({ error: 'leagueName, divisionName, and teamMap are required.' })
  }
  const db = getDb()
  try {
    await withTransaction(async conn => {
      // Delete old keys for this combo so re-generating produces no stale rows
      await conn.query('DELETE FROM DraftTeam WHERE LeagueName = ? AND DivisionName = ?', [leagueName, divisionName])
      for (const [teamKey, teamData] of Object.entries(teamMap)) {
        await conn.query(
          'REPLACE INTO DraftTeam (LeagueName, DivisionName, TeamKey, TeamData) VALUES (?, ?, ?, ?)',
          [leagueName, divisionName, teamKey, JSON.stringify(teamData)]
        )
      }
    })
    res.json({ ok: true, saved: Object.keys(teamMap).length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- DELETE /api/draft-teams ---
// Without teamKey: removes all draft teams for a league+division combo.
// With teamKey:    removes a single team row.
// Query params: leagueName, divisionName, [teamKey]
app.delete('/api/draft-teams', async (req, res) => {
  const { leagueName, divisionName, teamKey } = req.query
  if (!leagueName || !divisionName) {
    return res.status(400).json({ error: 'leagueName and divisionName query params are required.' })
  }
  const db = getDb()
  try {
    let result
    if (teamKey) {
      [result] = await db.query('DELETE FROM DraftTeam WHERE LeagueName = ? AND DivisionName = ? AND TeamKey = ?', [leagueName, divisionName, teamKey])
    } else {
      [result] = await db.query('DELETE FROM DraftTeam WHERE LeagueName = ? AND DivisionName = ?', [leagueName, divisionName])
    }
    res.json({ ok: true, deleted: result.affectedRows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE MANAGER — ScheduledTeam + Game CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// Shared SQL for returning full game info (used by multiple routes)
const GAME_SELECT_SQL = `
  SELECT
    g.GameID,
    g.GameDate,
    g.GameTime,
    g.Rink,
    g.CurrentGameStatus,
    g.HomeTeamScore,
    g.AwayTeamScore,
    g.SeasonID,
    ht.ScheduledTeamID  AS HomeTeamID,
    at_.ScheduledTeamID AS AwayTeamID,
    ht.Name   AS HomeTeamName,
    at_.Name  AS AwayTeamName,
    l.LeagueID,
    l.Name    AS LeagueName,
    d.DivisionID,
    d.Name    AS DivisionName,
    s.Name    AS SeasonName,
    (SELECT COUNT(*) FROM Game g2
      WHERE ((g2.HomeTeamID = g.HomeTeamID AND g2.HomeTeamScore > g2.AwayTeamScore)
          OR (g2.AwayTeamID = g.HomeTeamID AND g2.AwayTeamScore > g2.HomeTeamScore))
        AND g2.CurrentGameStatus = 'Scheduled'
    ) AS HomeWins,
    (SELECT COUNT(*) FROM Game g2
      WHERE ((g2.HomeTeamID = g.HomeTeamID AND g2.HomeTeamScore < g2.AwayTeamScore)
          OR (g2.AwayTeamID = g.HomeTeamID AND g2.AwayTeamScore < g2.HomeTeamScore))
        AND g2.CurrentGameStatus = 'Scheduled'
    ) AS HomeLosses,
    (SELECT COUNT(*) FROM Game g2
      WHERE (g2.HomeTeamID = g.HomeTeamID OR g2.AwayTeamID = g.HomeTeamID)
        AND g2.HomeTeamScore = g2.AwayTeamScore
        AND g2.CurrentGameStatus = 'Scheduled'
    ) AS HomeTies,
    (SELECT COUNT(*) FROM Game g2
      WHERE ((g2.HomeTeamID = g.AwayTeamID AND g2.HomeTeamScore > g2.AwayTeamScore)
          OR (g2.AwayTeamID = g.AwayTeamID AND g2.AwayTeamScore > g2.HomeTeamScore))
        AND g2.CurrentGameStatus = 'Scheduled'
    ) AS AwayWins,
    (SELECT COUNT(*) FROM Game g2
      WHERE ((g2.HomeTeamID = g.AwayTeamID AND g2.HomeTeamScore < g2.AwayTeamScore)
          OR (g2.AwayTeamID = g.AwayTeamID AND g2.AwayTeamScore < g2.HomeTeamScore))
        AND g2.CurrentGameStatus = 'Scheduled'
    ) AS AwayLosses,
    (SELECT COUNT(*) FROM Game g2
      WHERE (g2.HomeTeamID = g.AwayTeamID OR g2.AwayTeamID = g.AwayTeamID)
        AND g2.HomeTeamScore = g2.AwayTeamScore
        AND g2.CurrentGameStatus = 'Scheduled'
    ) AS AwayTies
  FROM Game g
  JOIN ScheduledTeam ht  ON ht.ScheduledTeamID  = g.HomeTeamID
  JOIN ScheduledTeam at_ ON at_.ScheduledTeamID = g.AwayTeamID
  JOIN League l           ON l.LeagueID           = ht.LeagueID
  JOIN Division d         ON d.DivisionID         = ht.DivisionID
  JOIN Season s           ON s.SeasonID           = g.SeasonID
`

// --- GET /api/scheduled-teams ---
// List all saved ScheduledTeams, with optional filters: ?leagueID=&divisionID=&seasonID=
app.get('/api/scheduled-teams', async (req, res) => {
  const db = getDb()
  const { leagueID, divisionID, seasonID } = req.query
  const where = []
  const params = []
  if (leagueID)   { where.push('st.LeagueID = ?');   params.push(Number(leagueID)) }
  if (divisionID) { where.push('st.DivisionID = ?'); params.push(Number(divisionID)) }
  if (seasonID)   { where.push('st.SeasonID = ?');   params.push(Number(seasonID)) }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  try {
    const [teams] = await db.query(`
      SELECT st.ScheduledTeamID, st.Name, st.LeagueID, st.DivisionID, st.SeasonID,
             st.EnteredDate, st.EnteredTime,
             l.Name AS LeagueName, d.Name AS DivisionName, s.Name AS SeasonName,
             (SELECT COUNT(*) FROM ScheduledTeamPlayer stp WHERE stp.ScheduledTeamID = st.ScheduledTeamID) AS playerCount,
             (SELECT COUNT(*) > 0 FROM Game g
              WHERE g.HomeTeamID = st.ScheduledTeamID OR g.AwayTeamID = st.ScheduledTeamID) AS hasGames
      FROM ScheduledTeam st
      JOIN League l   ON l.LeagueID   = st.LeagueID
      JOIN Division d ON d.DivisionID = st.DivisionID
      JOIN Season s   ON s.SeasonID   = st.SeasonID
      ${whereClause}
      ORDER BY l.Name, d.Name, st.Name
    `, params)
    res.json(teams)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Inserts a row into DeleteLog. Called inside transactions (pass conn) or outside (pass db pool).
// Non-fatal: log failures never block the actual delete.
async function logDelete(db, entityType, entityID, entityName, metadata) {
  try {
    await db.query(
      'INSERT INTO DeleteLog (EntityType, EntityID, EntityName, Metadata) VALUES (?, ?, ?, ?)',
      [entityType, entityID, entityName ?? null, metadata ? JSON.stringify(metadata) : null]
    )
  } catch { /* log failures are non-fatal */ }
}

// --- DELETE /api/scheduled-teams/deduplicate ---
// Keeps the highest ScheduledTeamID for each (LeagueID, DivisionID, SeasonID, Name) group
// and deletes every other copy. Cleans up teams saved multiple times by accident.
app.delete('/api/scheduled-teams/deduplicate', async (_req, res) => {
  const db = getDb()
  try {
    const [rows] = await db.query(`
      SELECT ScheduledTeamID FROM ScheduledTeam
      WHERE ScheduledTeamID NOT IN (
        SELECT MAX(ScheduledTeamID)
        FROM ScheduledTeam
        GROUP BY LeagueID, DivisionID, SeasonID, Name
      )
    `)
    const toDelete = rows.map(r => r.ScheduledTeamID)
    if (toDelete.length === 0) return res.json({ deleted: 0 })
    const [nameRows] = await db.query('SELECT ScheduledTeamID, Name FROM ScheduledTeam WHERE ScheduledTeamID IN (?)', [toDelete])
    const nameMap = Object.fromEntries(nameRows.map(r => [r.ScheduledTeamID, r.Name]))
    await withTransaction(async conn => {
      for (const id of toDelete) {
        await logDelete(conn, 'ScheduledTeam', id, nameMap[id] || null, { reason: 'deduplicate' })
        await conn.query('DELETE FROM Game WHERE HomeTeamID = ? OR AwayTeamID = ?', [id, id])
        await conn.query('DELETE FROM ScheduledTeamPlayer WHERE ScheduledTeamID = ?', [id])
        await conn.query('DELETE FROM ScheduledTeam WHERE ScheduledTeamID = ?', [id])
      }
    })
    res.json({ deleted: toDelete.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- DELETE /api/scheduled-teams/empty ---
// Bulk-delete all ScheduledTeam rows that have zero players (cleanup of bad saves).
// Returns { deleted: N }
app.delete('/api/scheduled-teams/empty', async (_req, res) => {
  const db = getDb()
  try {
    const [rows] = await db.query(`
      SELECT st.ScheduledTeamID FROM ScheduledTeam st
      WHERE (SELECT COUNT(*) FROM ScheduledTeamPlayer stp WHERE stp.ScheduledTeamID = st.ScheduledTeamID) = 0
    `)
    const ids = rows.map(r => r.ScheduledTeamID)
    if (ids.length === 0) return res.json({ deleted: 0 })
    const [nameRows2] = await db.query('SELECT ScheduledTeamID, Name FROM ScheduledTeam WHERE ScheduledTeamID IN (?)', [ids])
    const nameMap2 = Object.fromEntries(nameRows2.map(r => [r.ScheduledTeamID, r.Name]))
    await withTransaction(async conn => {
      for (const id of ids) {
        await logDelete(conn, 'ScheduledTeam', id, nameMap2[id] || null, { reason: 'empty_team_cleanup' })
        await conn.query('DELETE FROM Game WHERE HomeTeamID = ? OR AwayTeamID = ?', [id, id])
        await conn.query('DELETE FROM ScheduledTeam WHERE ScheduledTeamID = ?', [id])
      }
    })
    res.json({ deleted: ids.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- POST /api/scheduled-teams ---
// Save a batch of generated teams for a league/division/season.
// Body: { leagueID, divisionID, seasonID, teams: [{ teamName, players[] }] }
app.post('/api/scheduled-teams', async (req, res) => {
  const { leagueID, divisionID, seasonID, teams } = req.body
  if (!leagueID || !divisionID || !seasonID) return res.status(400).json({ error: 'leagueID, divisionID, and seasonID are required.' })
  if (!Array.isArray(teams) || teams.length === 0) return res.status(400).json({ error: 'teams array is required.' })

  const db = getDb()
  const [[{ cnt }]] = await db.query(
    'SELECT COUNT(*) AS cnt FROM ScheduledTeam WHERE LeagueID = ? AND DivisionID = ? AND SeasonID = ?',
    [leagueID, divisionID, seasonID]
  )
  if (cnt > 0) {
    return res.status(409).json({
      error: 'Teams already exist for this division and season. Delete the existing teams first, then save new ones.'
    })
  }

  const now = new Date().toISOString()
  const [enteredDate, enteredTime] = now.split('T')

  try {
    const savedTeams = await withTransaction(async conn => {
      const results = []
      for (const t of teams) {
        const [ins] = await conn.query(
          'INSERT INTO ScheduledTeam (Name, LeagueID, DivisionID, SeasonID, EnteredDate, EnteredTime) VALUES (?, ?, ?, ?, ?, ?)',
          [t.teamName || 'Unnamed Team', leagueID, divisionID, seasonID, enteredDate, enteredTime]
        )
        const stID = ins.insertId
        if (Array.isArray(t.players)) {
          for (const p of t.players) {
            if (p.playerID) await conn.query('INSERT IGNORE INTO ScheduledTeamPlayer (ScheduledTeamID, PlayerID) VALUES (?, ?)', [stID, Number(p.playerID)])
          }
        }
        results.push({ scheduledTeamID: stID, name: t.teamName })
      }
      return results
    })
    res.json({ ok: true, savedTeams })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- GET /api/scheduled-teams/:id/players ---
// Returns the player list for a single ScheduledTeam.
app.get('/api/scheduled-teams/:id/players', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' })
  const db = getDb()
  const [players] = await db.query(`
    SELECT p.PlayerID, p.FirstName, p.LastName, p.Position, p.Goals, p.Assists, p.GamesPlayed, p.Ppg, p.Gaa
    FROM ScheduledTeamPlayer stp
    JOIN Player p ON p.PlayerID = stp.PlayerID
    WHERE stp.ScheduledTeamID = ?
    ORDER BY p.LastName, p.FirstName
  `, [id])
  res.json(players)
})

// --- PUT /api/scheduled-teams/:id ---
// Rename a scheduled team.
app.put('/api/scheduled-teams/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' })
  const { name } = req.body
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required.' })
  const db = getDb()
  const [result] = await db.query('UPDATE ScheduledTeam SET Name = ? WHERE ScheduledTeamID = ?', [String(name).trim(), id])
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Team not found.' })
  res.json({ ok: true })
})

// --- DELETE /api/scheduled-teams/:id ---
// Delete a team and all its games.
app.delete('/api/scheduled-teams/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' })
  try {
    const [[teamInfo]] = await getDb().query('SELECT Name, LeagueID, DivisionID, SeasonID FROM ScheduledTeam WHERE ScheduledTeamID = ?', [id])
    await withTransaction(async conn => {
      await logDelete(conn, 'ScheduledTeam', id, teamInfo?.Name || null, teamInfo ? { LeagueID: teamInfo.LeagueID, DivisionID: teamInfo.DivisionID, SeasonID: teamInfo.SeasonID } : null)
      await conn.query('DELETE FROM Game WHERE HomeTeamID = ? OR AwayTeamID = ?', [id, id])
      await conn.query('DELETE FROM ScheduledTeamPlayer WHERE ScheduledTeamID = ?', [id])
      await conn.query('DELETE FROM ScheduledTeam WHERE ScheduledTeamID = ?', [id])
    })
    invalidateScheduleCache()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- POST /api/games/generate ---
// Generate a round-robin schedule for a set of saved teams.
// Body: { teamIDs[], seasonID, startDate, endDate?, gameDays[], gameTime, gameTimes?, rink, roundMultiplier, maxGamesPerDay? }
app.post('/api/games/generate', async (req, res) => {
  const { teamIDs, seasonID, startDate, endDate, gameDays, gameTime, gameTimes, rink, roundMultiplier = 1, maxGamesPerDay = 1, blackoutDates = [] } = req.body
  const times = Array.isArray(gameTimes) && gameTimes.length > 0 ? gameTimes : (gameTime ? [gameTime] : null)
  if (!Array.isArray(teamIDs) || teamIDs.length < 2) return res.status(400).json({ error: 'At least 2 teamIDs required.' })
  if (!seasonID || !startDate || !Array.isArray(gameDays) || gameDays.length === 0 || !times) {
    return res.status(400).json({ error: 'seasonID, startDate, gameDays, and gameTime are required.' })
  }

  const db = getDb()
  const [[season]] = await db.query('SELECT SeasonID FROM Season WHERE SeasonID = ?', [Number(seasonID)])
  if (!season) return res.status(400).json({ error: 'Invalid seasonID.' })

  const rounds = generateRoundRobin(teamIDs.map(Number))
  const games  = assignGameDates(rounds, startDate, gameDays.map(Number), times, rink || null, Number(seasonID), Number(roundMultiplier), endDate || null, Number(maxGamesPerDay) || 1, Array.isArray(blackoutDates) ? blackoutDates : [])

  try {
    await withTransaction(async conn => {
      for (const g of games) {
        await conn.query(
          'INSERT INTO Game (HomeTeamID, AwayTeamID, SeasonID, GameDate, GameTime, Rink, CurrentGameStatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [g.HomeTeamID, g.AwayTeamID, g.SeasonID, g.GameDate, g.GameTime, g.Rink, 'Draft']
        )
      }
    })
    res.json({ ok: true, gamesCreated: games.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- POST /api/generate-external/:divisionID ---
// Generates a seeded round-robin schedule for a division using teams pulled from
// the external WEHA data API. Creates ScheduledTeam rows if they don't exist yet,
// then inserts Draft Game rows using the seeded algorithm from CalanderHomepage.
// Body params: seasonID (optional), startDate, gameTime, rink
app.post('/api/generate-external/:divisionID', async (req, res) => {
  try {
    const divisionID = parseInt(req.params.divisionID)
    if (isNaN(divisionID)) return res.status(400).json({ error: 'Invalid divisionID.' })

    const {
      seasonID  = null,
      startDate = new Date().toISOString().split('T')[0],
      gameTime  = '18:00:00',
      rink      = null,
    } = req.body

    // Fetch all data from external API in parallel
    const [allTeams, allDivisions, allLeagues, allSeasons] = await Promise.all([
      getExternalTeams(), getExternalDivisions(), getExternalLeagues(), getExternalSeasons(),
    ])

    const teams = allTeams.filter(t => t.DivisionID === divisionID)
    if (teams.length < 2) return res.status(400).json({ error: 'Not enough teams in this division (need at least 2).' })

    const division = allDivisions.find(d => d.DivisionID === divisionID)
    const league   = allLeagues.find(l => l.LeagueID === division?.LeagueID)
    const leagueID = league?.LeagueID ?? null

    // Resolve a valid local seasonID
    const db = getDb()
    let validSeasonID = seasonID ? Number(seasonID) : null
    if (!validSeasonID) {
      const extSeason = allSeasons.find(s => s.LeagueID === leagueID)
      for (const query of [
        extSeason ? ['SELECT SeasonID FROM Season WHERE SeasonID = ? LIMIT 1', [extSeason.SeasonID]] : null,
        ['SELECT SeasonID FROM Season WHERE LeagueID = ? LIMIT 1', [leagueID]],
        ['SELECT SeasonID FROM Season LIMIT 1', []],
      ]) {
        if (!query) continue
        const [[row]] = await db.query(...query)
        if (row) { validSeasonID = row.SeasonID; break }
      }
    }
    if (!validSeasonID) return res.status(400).json({ error: 'No valid season found in local database.' })

    // Ensure a ScheduledTeam row exists for each external team
    const now = new Date().toISOString()
    const [enteredDate, rawTime] = now.split('T')
    const enteredTime = rawTime.split('.')[0]
    for (const team of teams) {
      await db.query(
        'INSERT IGNORE INTO ScheduledTeam (Name, LeagueID, DivisionID, SeasonID, EnteredDate, EnteredTime) VALUES (?, ?, ?, ?, ?, ?)',
        [team.Name, leagueID, divisionID, validSeasonID, enteredDate, enteredTime]
      )
    }

    // Map each external team name to its local ScheduledTeamID
    const [stRows] = await db.query(
      'SELECT ScheduledTeamID, Name FROM ScheduledTeam WHERE LeagueID = ? AND DivisionID = ? AND SeasonID = ?',
      [leagueID, divisionID, validSeasonID]
    )
    const stMap = Object.fromEntries(stRows.map(r => [r.Name, r.ScheduledTeamID]))

    // Build seeded schedule using win-percentage ordering
    const teamsForScheduler = teams.map(t => ({
      ...t,
      TeamID: stMap[t.Name] ?? null,
    }))
    const schedule = seededRoundRobin(teamsForScheduler)

    // Insert Draft Game rows, spreading slots across Fri/Sat/Sun within each week
    const weekendDays = [5, 6, 0]
    const insertedGames = []
    for (const game of schedule) {
      const homeID = game.homeTeamID
      const awayID = game.awayTeamID
      if (!homeID || !awayID) continue

      const weekStart  = new Date(new Date(startDate).getTime() + (game.week - 1) * 7 * 24 * 60 * 60 * 1000)
      const targetDay  = weekendDays[game.slot % 3]
      let daysToAdd    = targetDay - weekStart.getDay()
      if (daysToAdd < 0) daysToAdd += 7
      const gameDay    = new Date(weekStart.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
      const gameDate   = gameDay.toISOString().split('T')[0]

      const [result] = await db.query(
        'INSERT INTO Game (HomeTeamID, AwayTeamID, SeasonID, GameDate, GameTime, Rink, CurrentGameStatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [homeID, awayID, validSeasonID, gameDate, gameTime, rink || null, 'Draft']
      )
      insertedGames.push({ GameID: result.insertId, ...game, gameDate, gameTime, rink })
    }

    invalidateScheduleCache()
    res.json({
      divisionID,
      divisionName: division?.Name ?? 'Unknown',
      leagueName:   league?.Name   ?? 'Unknown',
      teamCount:    teams.length,
      totalGames:   insertedGames.length,
      schedule:     insertedGames,
    })
  } catch (err) {
    console.error('Error in generate-external:', err)
    res.status(500).json({ error: err.message })
  }
})

// --- GET /api/games ---
// Admin-facing: returns games with optional filters.
// Query: ?status=Draft|Scheduled  &leagueID=  &divisionID=  &seasonID=  &teamID=
app.get('/api/games', async (req, res) => {
  const db = getDb()
  const { status, leagueID, divisionID, seasonID, teamID } = req.query
  const where = []
  const params = []
  if (status)     { where.push("g.CurrentGameStatus = ?");              params.push(status) }
  if (leagueID)   { where.push("l.LeagueID = ?");                       params.push(Number(leagueID)) }
  if (divisionID) { where.push("d.DivisionID = ?");                     params.push(Number(divisionID)) }
  if (seasonID)   { where.push("g.SeasonID = ?");                       params.push(Number(seasonID)) }
  if (teamID)     { where.push("(g.HomeTeamID = ? OR g.AwayTeamID = ?)"); params.push(Number(teamID), Number(teamID)) }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  try {
    const [games] = await db.query(`${GAME_SELECT_SQL} ${whereClause} ORDER BY g.GameDate ASC, g.GameTime ASC`, params)
    res.json(games)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- POST /api/games ---
// Create a single game manually.
app.post('/api/games', async (req, res) => {
  const { HomeTeamID, AwayTeamID, SeasonID, GameDate, GameTime, Rink, CurrentGameStatus = 'Draft' } = req.body
  if (!HomeTeamID || !AwayTeamID || !SeasonID || !GameDate || !GameTime) {
    return res.status(400).json({ error: 'HomeTeamID, AwayTeamID, SeasonID, GameDate, GameTime are required.' })
  }
  const db = getDb()
  const [result] = await db.query(
    'INSERT INTO Game (HomeTeamID, AwayTeamID, SeasonID, GameDate, GameTime, Rink, CurrentGameStatus) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [HomeTeamID, AwayTeamID, SeasonID, GameDate, GameTime, Rink || null, CurrentGameStatus]
  )
  res.json({ ok: true, GameID: result.insertId })
})

// --- PUT /api/games/:id ---
// Update any fields of a game.
app.put('/api/games/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' })
  const db = getDb()
  const [[existing]] = await db.query('SELECT * FROM Game WHERE GameID = ?', [id])
  if (!existing) return res.status(404).json({ error: 'Game not found.' })
  const { GameDate, GameTime, Rink, CurrentGameStatus, HomeTeamScore, AwayTeamScore, HomeTeamID, AwayTeamID } = req.body
  await db.query(`
    UPDATE Game SET
      GameDate          = ?, GameTime = ?, Rink = ?,
      CurrentGameStatus = ?, HomeTeamScore = ?, AwayTeamScore = ?,
      HomeTeamID = ?, AwayTeamID = ?
    WHERE GameID = ?
  `, [
    GameDate          ?? existing.GameDate,
    GameTime          ?? existing.GameTime,
    Rink              !== undefined ? Rink : existing.Rink,
    CurrentGameStatus ?? existing.CurrentGameStatus,
    HomeTeamScore     !== undefined ? HomeTeamScore : existing.HomeTeamScore,
    AwayTeamScore     !== undefined ? AwayTeamScore : existing.AwayTeamScore,
    HomeTeamID        ?? existing.HomeTeamID,
    AwayTeamID        ?? existing.AwayTeamID,
    id
  ])
  invalidateScheduleCache()
  res.json({ ok: true })
})

// --- DELETE /api/games/:id ---
app.delete('/api/games/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' })
  const db = getDb()
  const [[game]] = await db.query('SELECT HomeTeamID, AwayTeamID, GameDate, GameTime, CurrentGameStatus FROM Game WHERE GameID = ?', [id])
  await logDelete(db, 'Game', id, game ? `Game #${id} on ${game.GameDate}` : null, game ? { HomeTeamID: game.HomeTeamID, AwayTeamID: game.AwayTeamID, GameDate: game.GameDate, GameTime: game.GameTime, Status: game.CurrentGameStatus } : null)
  await db.query('DELETE FROM Game WHERE GameID = ?', [id])
  invalidateScheduleCache()
  res.json({ ok: true })
})

// --- DELETE /api/games/by-date ---
// Delete all games on a specific date. Body: { date: 'YYYY-MM-DD', divisionID?, seasonID? }
app.delete('/api/games/by-date', async (req, res) => {
  const { date, divisionID, seasonID } = req.body
  if (!date) return res.status(400).json({ error: 'date is required.' })
  const db = getDb()
  const where = ['g.GameDate = ?']
  const params = [date]
  if (divisionID) { where.push('ht.DivisionID = ?'); params.push(Number(divisionID)) }
  if (seasonID)   { where.push('g.SeasonID = ?');    params.push(Number(seasonID)) }
  const [rows] = await db.query(`
    SELECT g.GameID FROM Game g
    JOIN ScheduledTeam ht ON ht.ScheduledTeamID = g.HomeTeamID
    WHERE ${where.join(' AND ')}
  `, params)
  const ids = rows.map(r => r.GameID)
  if (ids.length === 0) return res.json({ ok: true, deleted: 0 })
  for (const gid of ids) {
    await logDelete(db, 'Game', gid, `Game on ${date}`, { date, divisionID: divisionID || null, seasonID: seasonID || null })
  }
  await db.query('DELETE FROM Game WHERE GameID IN (?)', [ids])
  invalidateScheduleCache()
  res.json({ ok: true, deleted: ids.length })
})

// --- POST /api/games/publish ---
// Publish games: set status to Scheduled. Body: { gameIDs[] } OR { divisionID, seasonID }
app.post('/api/games/publish', async (req, res) => {
  const db = getDb()
  const { gameIDs, divisionID, seasonID } = req.body
  if (Array.isArray(gameIDs) && gameIDs.length > 0) {
    await db.query("UPDATE Game SET CurrentGameStatus = 'Scheduled' WHERE GameID IN (?)", [gameIDs.map(Number)])
  } else if (divisionID && seasonID) {
    await db.query(`
      UPDATE Game SET CurrentGameStatus = 'Scheduled'
      WHERE SeasonID = ? AND CurrentGameStatus = 'Draft'
        AND HomeTeamID IN (SELECT ScheduledTeamID FROM ScheduledTeam WHERE DivisionID = ? AND SeasonID = ?)
    `, [Number(seasonID), Number(divisionID), Number(seasonID)])
  } else {
    return res.status(400).json({ error: 'Provide gameIDs[] or divisionID+seasonID.' })
  }
  invalidateScheduleCache()
  res.json({ ok: true })
})

// --- POST /api/games/unpublish ---
// Unpublish games: set status back to Draft. Same body options as publish.
app.post('/api/games/unpublish', async (req, res) => {
  const db = getDb()
  const { gameIDs, divisionID, seasonID } = req.body
  if (Array.isArray(gameIDs) && gameIDs.length > 0) {
    await db.query("UPDATE Game SET CurrentGameStatus = 'Draft' WHERE GameID IN (?)", [gameIDs.map(Number)])
  } else if (divisionID && seasonID) {
    await db.query(`
      UPDATE Game SET CurrentGameStatus = 'Draft'
      WHERE SeasonID = ? AND CurrentGameStatus = 'Scheduled'
        AND HomeTeamID IN (SELECT ScheduledTeamID FROM ScheduledTeam WHERE DivisionID = ? AND SeasonID = ?)
    `, [Number(seasonID), Number(divisionID), Number(seasonID)])
  } else {
    return res.status(400).json({ error: 'Provide gameIDs[] or divisionID+seasonID.' })
  }
  invalidateScheduleCache()
  res.json({ ok: true })
})

// ═══════════════════════════════════════════════════════════════════════════════

// --- GET /api/getPlayers ---
// Returns players. Optional ?limit=N (default 100, max 1000).
app.get('/api/getPlayers', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000)
  try {
    const [rows] = await getDb().query('SELECT * FROM Player ORDER BY LastName, FirstName LIMIT ?', [limit])
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- GET /api/getLeagues ---
app.get('/api/getLeagues', async (_req, res) => {
  try {
    const [rows] = await getDb().query('SELECT * FROM League')
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- GET /api/getDivisions ---
app.get('/api/getDivisions', async (_req, res) => {
  try {
    const [rows] = await getDb().query('SELECT * FROM Division')
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- GET /api/getTeams ---
app.get('/api/getTeams', async (_req, res) => {
  try {
    const [rows] = await getDb().query('SELECT * FROM Team')
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- GET /api/getSeasons ---
app.get('/api/getSeasons', async (_req, res) => {
  try {
    const [rows] = await getDb().query('SELECT * FROM Season')
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════

// Optimised public schedule query.
// Uses a single CTE to pre-compute per-team win/loss/tie records in one pass,
// then joins them — replaces the original 6 correlated subqueries per row.
const SCHEDULE_QUERY = `
  WITH TeamRecord AS (
    SELECT
      st.ScheduledTeamID,
      SUM(CASE
        WHEN (g.HomeTeamID = st.ScheduledTeamID AND g.HomeTeamScore > g.AwayTeamScore)
          OR (g.AwayTeamID = st.ScheduledTeamID AND g.AwayTeamScore > g.HomeTeamScore)
        THEN 1 ELSE 0 END) AS Wins,
      SUM(CASE
        WHEN (g.HomeTeamID = st.ScheduledTeamID AND g.HomeTeamScore < g.AwayTeamScore)
          OR (g.AwayTeamID = st.ScheduledTeamID AND g.AwayTeamScore < g.HomeTeamScore)
        THEN 1 ELSE 0 END) AS Losses,
      SUM(CASE
        WHEN (g.HomeTeamID = st.ScheduledTeamID OR g.AwayTeamID = st.ScheduledTeamID)
          AND g.HomeTeamScore IS NOT NULL AND g.HomeTeamScore = g.AwayTeamScore
        THEN 1 ELSE 0 END) AS Ties
    FROM ScheduledTeam st
    LEFT JOIN Game g
      ON (g.HomeTeamID = st.ScheduledTeamID OR g.AwayTeamID = st.ScheduledTeamID)
     AND g.CurrentGameStatus = 'Scheduled'
    GROUP BY st.ScheduledTeamID
  )
  SELECT
    g.GameID, g.GameDate, g.GameTime, g.Rink,
    g.CurrentGameStatus, g.HomeTeamScore, g.AwayTeamScore, g.SeasonID,
    ht.ScheduledTeamID  AS HomeTeamID,
    at_.ScheduledTeamID AS AwayTeamID,
    ht.Name  AS HomeTeamName,
    at_.Name AS AwayTeamName,
    l.LeagueID, l.Name   AS LeagueName,
    d.DivisionID, d.Name AS DivisionName,
    s.Name AS SeasonName,
    COALESCE(hr.Wins,   0) AS HomeWins,
    COALESCE(hr.Losses, 0) AS HomeLosses,
    COALESCE(hr.Ties,   0) AS HomeTies,
    COALESCE(ar.Wins,   0) AS AwayWins,
    COALESCE(ar.Losses, 0) AS AwayLosses,
    COALESCE(ar.Ties,   0) AS AwayTies
  FROM Game g
  JOIN ScheduledTeam ht  ON ht.ScheduledTeamID  = g.HomeTeamID
  JOIN ScheduledTeam at_ ON at_.ScheduledTeamID = g.AwayTeamID
  JOIN League l           ON l.LeagueID          = ht.LeagueID
  JOIN Division d         ON d.DivisionID        = ht.DivisionID
  JOIN Season s           ON s.SeasonID          = g.SeasonID
  LEFT JOIN TeamRecord hr ON hr.ScheduledTeamID  = g.HomeTeamID
  LEFT JOIN TeamRecord ar ON ar.ScheduledTeamID  = g.AwayTeamID
  WHERE g.CurrentGameStatus = 'Scheduled'
  ORDER BY g.GameDate ASC, g.GameTime ASC
`

// Server-side schedule cache — avoids re-running the query on every public page load.
// Invalidated whenever a game is published, updated, or deleted.
let _scheduleCache    = null
let _scheduleCacheExp = 0
const SCHEDULE_TTL_MS = 60 * 1000 // 1 minute

function invalidateScheduleCache() {
  _scheduleCache    = null
  _scheduleCacheExp = 0
}

// --- GET /api/schedule ---
// Public-facing: returns only PUBLISHED (Scheduled) games for the homepage calendar.
app.get('/api/schedule', async (_req, res) => {
  if (_scheduleCache && Date.now() < _scheduleCacheExp) {
    res.setHeader('X-Cache', 'HIT')
    return res.json(_scheduleCache)
  }
  try {
    const [games] = await getDb().query(SCHEDULE_QUERY)
    _scheduleCache    = games
    _scheduleCacheExp = Date.now() + SCHEDULE_TTL_MS
    res.setHeader('X-Cache', 'MISS')
    res.json(games)
  } catch (e) {
    res.status(500).json({ error: `Failed to load schedule: ${e.message}` })
  }
})

// --- POST /api/player ---
// Creates a new player record.
app.post('/api/player', async (req, res) => {
  const { firstName, lastName, position, jerseyNumber, goals, assists, gamesPlayed, gaa } = req.body
  if (!firstName?.trim() || !lastName?.trim()) {
    return res.status(400).json({ error: 'First name and last name are required.' })
  }
  const db = getDb()
  try {
    const [result] = await db.query(
      'INSERT INTO Player (FirstName, LastName, Position, JerseyNumber, Goals, Assists, GamesPlayed, Gaa) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        firstName.trim(),
        lastName.trim(),
        position?.trim() || null,
        jerseyNumber?.toString().trim() || null,
        goals       != null ? Number(goals)       : null,
        assists     != null ? Number(assists)     : null,
        gamesPlayed != null ? Number(gamesPlayed) : null,
        gaa         != null ? Number(gaa)         : null,
      ]
    )
    const [[player]] = await db.query('SELECT * FROM Player WHERE PlayerID = ?', [result.insertId])
    res.json({ ok: true, player })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- DELETE /api/player/:id ---
// Deletes a player and removes them from all team rosters.
app.delete('/api/player/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' })
  try {
    const [[player]] = await getDb().query('SELECT FirstName, LastName, Position FROM Player WHERE PlayerID = ?', [id])
    await withTransaction(async conn => {
      await logDelete(conn, 'Player', id, player ? `${player.FirstName} ${player.LastName}` : null, player ? { Position: player.Position } : null)
      await conn.query('DELETE FROM ScheduledTeamPlayer WHERE PlayerID = ?', [id])
      await conn.query('DELETE FROM PlayerTeam WHERE PlayerID = ?', [id])
      await conn.query('DELETE FROM Player WHERE PlayerID = ?', [id])
    })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- GET /api/localteams ---
// Returns all ScheduledTeams with league/division names and computed W/L/T records.
// Used by the public-facing Hero team dropdown and TeamPage.
app.get('/api/localteams', async (_req, res) => {
  const db = getDb()
  try {
    const [teams] = await db.query(`
      WITH TeamRecord AS (
        SELECT
          st.ScheduledTeamID,
          SUM(CASE
            WHEN (g.HomeTeamID = st.ScheduledTeamID AND g.HomeTeamScore > g.AwayTeamScore)
              OR (g.AwayTeamID = st.ScheduledTeamID AND g.AwayTeamScore > g.HomeTeamScore)
            THEN 1 ELSE 0 END) AS Wins,
          SUM(CASE
            WHEN (g.HomeTeamID = st.ScheduledTeamID AND g.HomeTeamScore < g.AwayTeamScore)
              OR (g.AwayTeamID = st.ScheduledTeamID AND g.AwayTeamScore < g.HomeTeamScore)
            THEN 1 ELSE 0 END) AS Losses,
          SUM(CASE
            WHEN (g.HomeTeamID = st.ScheduledTeamID OR g.AwayTeamID = st.ScheduledTeamID)
              AND g.HomeTeamScore IS NOT NULL AND g.HomeTeamScore = g.AwayTeamScore
            THEN 1 ELSE 0 END) AS Ties,
          COUNT(CASE
            WHEN g.HomeTeamID = st.ScheduledTeamID OR g.AwayTeamID = st.ScheduledTeamID
            THEN 1 END) AS GamesPlayed
        FROM ScheduledTeam st
        LEFT JOIN Game g
          ON (g.HomeTeamID = st.ScheduledTeamID OR g.AwayTeamID = st.ScheduledTeamID)
          AND g.CurrentGameStatus = 'Scheduled'
        GROUP BY st.ScheduledTeamID
      )
      SELECT
        st.ScheduledTeamID AS TeamID,
        st.Name,
        st.LeagueID,
        st.DivisionID,
        st.SeasonID,
        l.Name AS LeagueName,
        d.Name AS DivisionName,
        s.Name AS SeasonName,
        COALESCE(tr.Wins,        0) AS Wins,
        COALESCE(tr.Losses,      0) AS Losses,
        COALESCE(tr.Ties,        0) AS Ties,
        COALESCE(tr.GamesPlayed, 0) AS GamesPlayed
      FROM ScheduledTeam st
      JOIN League l   ON l.LeagueID   = st.LeagueID
      JOIN Division d ON d.DivisionID = st.DivisionID
      JOIN Season s   ON s.SeasonID   = st.SeasonID
      LEFT JOIN TeamRecord tr ON tr.ScheduledTeamID = st.ScheduledTeamID
      ORDER BY l.Name, d.Name, st.Name
    `)
    res.json(teams)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- GET /api/players/:teamID ---
// Returns players on a ScheduledTeam (used by public TeamPage).
app.get('/api/players/:teamID', async (req, res) => {
  const id = Number(req.params.teamID)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' })
  const db = getDb()
  try {
    const [players] = await db.query(`
      SELECT p.PlayerID, p.FirstName, p.LastName, p.Position,
             p.JerseyNumber, p.Goals, p.Assists, p.GamesPlayed, p.Ppg, p.Gaa
      FROM ScheduledTeamPlayer stp
      JOIN Player p ON p.PlayerID = stp.PlayerID
      WHERE stp.ScheduledTeamID = ?
      ORDER BY p.LastName, p.FirstName
    `, [id])
    res.json(players)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- DELETE /api/division/:id ---
// Delete a division and every associated scheduled team + games (full cascade).
app.delete('/api/division/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' })
  try {
    const [[div]] = await getDb().query('SELECT Name, LeagueID FROM Division WHERE DivisionID = ?', [id])
    await withTransaction(async conn => {
      const [rows] = await conn.query('SELECT ScheduledTeamID, Name FROM ScheduledTeam WHERE DivisionID = ?', [id])
      for (const { ScheduledTeamID: tid, Name: tname } of rows) {
        await logDelete(conn, 'ScheduledTeam', tid, tname, { reason: 'division_deleted', DivisionID: id })
        await conn.query('DELETE FROM Game WHERE HomeTeamID = ? OR AwayTeamID = ?', [tid, tid])
        await conn.query('DELETE FROM ScheduledTeamPlayer WHERE ScheduledTeamID = ?', [tid])
        await conn.query('DELETE FROM ScheduledTeam WHERE ScheduledTeamID = ?', [tid])
      }
      await logDelete(conn, 'Division', id, div?.Name || null, { LeagueID: div?.LeagueID || null })
      await conn.query('DELETE FROM Division WHERE DivisionID = ?', [id])
    })
    invalidateScheduleCache()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- DELETE /api/league/:id ---
// Delete a league and everything beneath it: divisions, seasons, scheduled teams, games.
app.delete('/api/league/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' })
  try {
    const [[league]] = await getDb().query('SELECT Name FROM League WHERE LeagueID = ?', [id])
    await withTransaction(async conn => {
      const [rows] = await conn.query('SELECT ScheduledTeamID, Name FROM ScheduledTeam WHERE LeagueID = ?', [id])
      for (const { ScheduledTeamID: tid, Name: tname } of rows) {
        await logDelete(conn, 'ScheduledTeam', tid, tname, { reason: 'league_deleted', LeagueID: id })
        await conn.query('DELETE FROM Game WHERE HomeTeamID = ? OR AwayTeamID = ?', [tid, tid])
        await conn.query('DELETE FROM ScheduledTeamPlayer WHERE ScheduledTeamID = ?', [tid])
        await conn.query('DELETE FROM ScheduledTeam WHERE ScheduledTeamID = ?', [tid])
      }
      await logDelete(conn, 'League', id, league?.Name || null, null)
      await conn.query('DELETE FROM Season WHERE LeagueID = ?', [id])
      await conn.query('DELETE FROM Division WHERE LeagueID = ?', [id])
      await conn.query('DELETE FROM League WHERE LeagueID = ?', [id])
    })
    invalidateScheduleCache()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- DELETE /api/season/:id ---
// Delete a season and all its games + scheduled teams.
app.delete('/api/season/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' })
  try {
    const [[season]] = await getDb().query('SELECT Name, LeagueID FROM Season WHERE SeasonID = ?', [id])
    await withTransaction(async conn => {
      await conn.query('DELETE FROM Game WHERE SeasonID = ?', [id])
      const [rows] = await conn.query('SELECT ScheduledTeamID, Name FROM ScheduledTeam WHERE SeasonID = ?', [id])
      for (const { ScheduledTeamID: tid, Name: tname } of rows) {
        await logDelete(conn, 'ScheduledTeam', tid, tname, { reason: 'season_deleted', SeasonID: id })
        await conn.query('DELETE FROM ScheduledTeamPlayer WHERE ScheduledTeamID = ?', [tid])
        await conn.query('DELETE FROM ScheduledTeam WHERE ScheduledTeamID = ?', [tid])
      }
      await logDelete(conn, 'Season', id, season?.Name || null, { LeagueID: season?.LeagueID || null })
      await conn.query('DELETE FROM Season WHERE SeasonID = ?', [id])
    })
    invalidateScheduleCache()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- GET /api/delete-log ---
// Returns the most recent deletion events. Admin-only.
// Query: ?limit=N (default 100, max 500)
app.get('/api/delete-log', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500)
  try {
    const [rows] = await getDb().query(
      'SELECT LogID, EntityType, EntityID, EntityName, DeletedAt, Metadata FROM DeleteLog ORDER BY DeletedAt DESC LIMIT ?',
      [limit]
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 3001
initSchema()
  .then(() => app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`)))
  .catch(e => { console.error('DB schema init failed:', e.message); process.exit(1) })