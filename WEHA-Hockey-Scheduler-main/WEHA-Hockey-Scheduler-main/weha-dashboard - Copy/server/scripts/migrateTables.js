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

function needsMigration() {
  const cols = db.prepare("PRAGMA table_info(ScheduledTeam)").all()
  return cols.some(c => c.name === 'EnteredByID')
}

if (!needsMigration()) {
  console.log('Tables already up to date — no migration needed.')
  process.exit(0)
}

console.log('Running table migration...')

db.pragma('foreign_keys = OFF')

db.transaction(() => {
  // ── ScheduledTeam ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS ScheduledTeam_new (
      ScheduledTeamID INTEGER PRIMARY KEY,
      Name            TEXT    NOT NULL,
      LeagueID        INTEGER NOT NULL,
      DivisionID      INTEGER NOT NULL,
      SeasonID        INTEGER NOT NULL,
      EnteredDate     TEXT,
      EnteredTime     TEXT,
      FOREIGN KEY (LeagueID)   REFERENCES League(LeagueID),
      FOREIGN KEY (DivisionID) REFERENCES Division(DivisionID),
      FOREIGN KEY (SeasonID)   REFERENCES Season(SeasonID)
    );
    INSERT OR IGNORE INTO ScheduledTeam_new
      (ScheduledTeamID, Name, LeagueID, DivisionID, SeasonID, EnteredDate, EnteredTime)
    SELECT ScheduledTeamID, Name, LeagueID, DivisionID, SeasonID, EnteredDate, EnteredTime
    FROM ScheduledTeam;
  `)

  // ── ScheduledTeamPlayer references ScheduledTeam — recreate it too ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS ScheduledTeamPlayer_new (
      ScheduledTeamID INTEGER NOT NULL,
      PlayerID        INTEGER NOT NULL,
      PRIMARY KEY (ScheduledTeamID, PlayerID),
      FOREIGN KEY (ScheduledTeamID) REFERENCES ScheduledTeam_new(ScheduledTeamID),
      FOREIGN KEY (PlayerID)        REFERENCES Player(PlayerID)
    );
    INSERT OR IGNORE INTO ScheduledTeamPlayer_new SELECT * FROM ScheduledTeamPlayer;
  `)

  // ── Game ───────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS Game_new (
      GameID             INTEGER PRIMARY KEY,
      HomeTeamID         INTEGER NOT NULL,
      AwayTeamID         INTEGER NOT NULL,
      SeasonID           INTEGER NOT NULL,
      HomeTeamScore      INTEGER,
      AwayTeamScore      INTEGER,
      GameDate           TEXT    NOT NULL,
      GameTime           TEXT    NOT NULL,
      Rink               TEXT,
      CurrentGameStatus  TEXT    DEFAULT 'Draft',
      FOREIGN KEY (HomeTeamID) REFERENCES ScheduledTeam_new(ScheduledTeamID),
      FOREIGN KEY (AwayTeamID) REFERENCES ScheduledTeam_new(ScheduledTeamID),
      FOREIGN KEY (SeasonID)   REFERENCES Season(SeasonID)
    );
    INSERT OR IGNORE INTO Game_new SELECT * FROM Game;
  `)

  // ── Swap old → new ─────────────────────────────────────────────
  db.exec(`
    DROP TABLE IF EXISTS ScheduledTeamPlayer;
    DROP TABLE IF EXISTS Game;
    DROP TABLE IF EXISTS ScheduledTeam;

    ALTER TABLE ScheduledTeam_new      RENAME TO ScheduledTeam;
    ALTER TABLE ScheduledTeamPlayer_new RENAME TO ScheduledTeamPlayer;
    ALTER TABLE Game_new               RENAME TO Game;

    CREATE INDEX IF NOT EXISTS idx_game_status ON Game (CurrentGameStatus);
  `)
})()

db.pragma('foreign_keys = ON')

console.log('Migration complete.')
