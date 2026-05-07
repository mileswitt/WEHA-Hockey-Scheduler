/**
 * Seed the MySQL database from the 6 source CSVs.
 *
 * Usage:
 *   node server/scripts/seedDatabase.js
 *   node server/scripts/seedDatabase.js --csv-dir "C:/path/to/csv/folder"
 *
 * Defaults to server/data/ if --csv-dir is not provided.
 * Insertion is idempotent (INSERT IGNORE).
 */

import { parse } from 'csv-parse/sync'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { withTransaction } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// --- Resolve CSV directory from CLI arg or default ---
function resolveCsvDir() {
  const idx = process.argv.indexOf('--csv-dir')
  if (idx !== -1 && process.argv[idx + 1]) {
    return path.resolve(process.argv[idx + 1])
  }
  return path.join(__dirname, '..', 'data')
}

// --- Parse a CSV file into an array of objects ---
// Handles malformed fields like "DANIEL "DANO" " by collapsing inner quoted nicknames.
function readCsv(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8')
  // Repeatedly collapse inner quoted nicknames until the string stabilises
  // "DANIEL "DANO" " → "DANIEL DANO "
  let prev
  do {
    prev = raw
    raw = raw.replace(/"([^,\n"]*)"([^,\n"]+)"([^,\n"]*)"/g, '"$1$2$3"')
  } while (raw !== prev)
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true })
}

// --- Convert "NULL" strings to actual null ---
function clean(val) {
  if (val === 'NULL' || val === '' || val === undefined) return null
  return val
}

// --- Main seed function ---
async function seed() {
  const csvDir = resolveCsvDir()

  console.log(`Seeding from: ${csvDir}`)
  console.log(`Database:     ${process.env.MYSQL_DATABASE || 'weha'} @ ${process.env.MYSQL_HOST || 'localhost'}\n`)

  // ── 1. League ──────────────────────────────────────────────────────────────
  const leagues = readCsv(path.join(csvDir, 'league.csv'))
  await withTransaction(async (conn) => {
    for (const row of leagues) {
      await conn.query(
        'INSERT IGNORE INTO League (LeagueID, Name) VALUES (?, ?)',
        [Number(row.LeagueID), row.Name]
      )
    }
  })
  console.log(`League:     inserted ${leagues.length} rows`)

  // ── 2. Division ────────────────────────────────────────────────────────────
  const divisions = readCsv(path.join(csvDir, 'division.csv'))
  await withTransaction(async (conn) => {
    for (const row of divisions) {
      await conn.query(
        'INSERT IGNORE INTO Division (DivisionID, LeagueID, Name) VALUES (?, ?, ?)',
        [Number(row.DivisionID), Number(row.LeagueID), row.Name]
      )
    }
  })
  console.log(`Division:   inserted ${divisions.length} rows`)

  // ── 3. Season ──────────────────────────────────────────────────────────────
  const seasons = readCsv(path.join(csvDir, 'season.csv'))
  await withTransaction(async (conn) => {
    for (const row of seasons) {
      await conn.query(
        'INSERT IGNORE INTO Season (SeasonID, LeagueID, Name) VALUES (?, ?, ?)',
        [Number(row.SeasonID), Number(row.LeagueID), row.Name]
      )
    }
  })
  console.log(`Season:     inserted ${seasons.length} rows`)

  // ── 4. Team ────────────────────────────────────────────────────────────────
  const teams = readCsv(path.join(csvDir, 'team.csv'))
  await withTransaction(async (conn) => {
    for (const row of teams) {
      await conn.query(
        'INSERT IGNORE INTO Team (TeamID, DivisionID, LeagueID, Name, Wins, Loses, Ties, GamesPlayed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          Number(row.TeamID),
          Number(row.DivisionID),
          Number(row.LeagueID),
          row.Name,
          Number(clean(row.Wins)        ?? 0),
          Number(clean(row.Loses)       ?? 0),
          Number(clean(row.Ties)        ?? 0),
          Number(clean(row.GamesPlayed) ?? 0),
        ]
      )
    }
  })
  console.log(`Team:       inserted ${teams.length} rows`)

  // ── 5. Player ──────────────────────────────────────────────────────────────
  const players = readCsv(path.join(csvDir, 'player.csv'))
  await withTransaction(async (conn) => {
    for (const row of players) {
      const gaa = clean(row.Gaa)
      await conn.query(
        'INSERT IGNORE INTO Player (PlayerID, FirstName, LastName, Position, JerseyNumber, Goals, Assists, GamesPlayed, Gaa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          Number(row.PlayerID),
          row.FirstName,
          row.LastName,
          clean(row.Position),
          clean(row.JerseyNumber),
          clean(row.Goals)       !== null ? Number(row.Goals)       : null,
          clean(row.Assists)     !== null ? Number(row.Assists)     : null,
          clean(row.GamesPlayed) !== null ? Number(row.GamesPlayed) : null,
          gaa !== null ? Number(gaa) : null,
        ]
      )
    }
  })
  console.log(`Player:     inserted ${players.length} rows`)

  // ── 6. PlayerTeam ──────────────────────────────────────────────────────────
  const playerTeams = readCsv(path.join(csvDir, 'player_team.csv'))
  await withTransaction(async (conn) => {
    for (const row of playerTeams) {
      await conn.query(
        'INSERT IGNORE INTO PlayerTeam (PlayerID, TeamID, SeasonID) VALUES (?, ?, ?)',
        [Number(row.PlayerID), Number(row.TeamID), Number(row.SeasonID)]
      )
    }
  })
  console.log(`PlayerTeam: inserted ${playerTeams.length} rows`)

  console.log('\nDone. Database seeded successfully.')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
