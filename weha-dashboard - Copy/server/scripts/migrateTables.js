/**
 * migrateTables.js
 * Migrates ScheduledTeam and Game tables to the updated schema:
 *  - ScheduledTeam: drops EnteredByID FK, makes EnteredDate/Time nullable
 *  - Game:          makes HomeTeamScore/AwayTeamScore nullable, default status 'Draft'
 *
 * Run once: node server/scripts/migrateTables.js
 */

import { getDb } from '../db.js'

const db = getDb()

const [colRows] = await db.query(`
  SELECT COLUMN_NAME
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ScheduledTeam'
    AND COLUMN_NAME = 'EnteredByID'
`)

if (colRows.length === 0) {
  console.log('Tables already up to date — no migration needed.')
  process.exit(0)
}

console.log('Running table migration...')

await db.query('SET FOREIGN_KEY_CHECKS = 0')
try {
  await db.query('ALTER TABLE ScheduledTeam DROP COLUMN EnteredByID')
  await db.query('ALTER TABLE ScheduledTeam MODIFY COLUMN EnteredDate DATETIME NULL')
  await db.query('ALTER TABLE ScheduledTeam MODIFY COLUMN EnteredTime TIME NULL')
  await db.query('ALTER TABLE Game MODIFY COLUMN HomeTeamScore INT NULL')
  await db.query('ALTER TABLE Game MODIFY COLUMN AwayTeamScore INT NULL')
  await db.query("ALTER TABLE Game MODIFY COLUMN CurrentGameStatus VARCHAR(20) DEFAULT 'Draft'")
  try {
    await db.query('CREATE INDEX idx_game_status ON Game (CurrentGameStatus)')
  } catch (e) {
    if (e.errno !== 1061) throw e  // 1061 = duplicate key name, index already exists
  }
} finally {
  await db.query('SET FOREIGN_KEY_CHECKS = 1')
}

console.log('Migration complete.')
process.exit(0)
