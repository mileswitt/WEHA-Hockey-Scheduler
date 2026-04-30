-- SQLite schema for WEHA Hockey Scheduler

CREATE TABLE IF NOT EXISTS Admin (
    AdminID  INTEGER PRIMARY KEY AUTOINCREMENT,
    Email    TEXT NOT NULL UNIQUE,
    PasswordHash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS League (
    LeagueID INTEGER PRIMARY KEY,
    Name     TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Division (
    DivisionID INTEGER PRIMARY KEY,
    LeagueID   INTEGER,
    Name       TEXT NOT NULL,
    FOREIGN KEY (LeagueID) REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Team (
    TeamID      INTEGER PRIMARY KEY,
    DivisionID  INTEGER NOT NULL,
    LeagueID    INTEGER NOT NULL,
    Name        TEXT    NOT NULL,
    Wins        INTEGER DEFAULT 0,
    Loses       INTEGER DEFAULT 0,
    Ties        INTEGER DEFAULT 0,
    GamesPlayed INTEGER DEFAULT 0,
    FOREIGN KEY (DivisionID) REFERENCES Division(DivisionID),
    FOREIGN KEY (LeagueID)   REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Season (
    SeasonID INTEGER PRIMARY KEY,
    LeagueID INTEGER NOT NULL,
    Name     TEXT    NOT NULL,
    FOREIGN KEY (LeagueID) REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Player (
    PlayerID     INTEGER PRIMARY KEY,
    FirstName    TEXT NOT NULL,
    LastName     TEXT NOT NULL,
    Position     TEXT,
    JerseyNumber TEXT,
    Goals        INTEGER,
    Assists      INTEGER,
    GamesPlayed  INTEGER,
    Ppg          REAL,
    Gaa          REAL
);

-- ScheduledTeam: teams created by admin for scheduling (no EnteredByID FK)
CREATE TABLE IF NOT EXISTS ScheduledTeam (
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

-- Game: Draft = not yet published, Scheduled = public on calendar
CREATE TABLE IF NOT EXISTS Game (
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
    FOREIGN KEY (HomeTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (AwayTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (SeasonID)   REFERENCES Season(SeasonID)
);

-- DraftTeam: generated teams held in memory until the admin saves them to ScheduledTeam.
-- Survives page refreshes. Cleared when the admin saves or dismisses the group.
-- UNIQUE on (LeagueName, DivisionName, TeamKey) so re-generating always replaces,
-- never accumulates duplicate draft rows.
CREATE TABLE IF NOT EXISTS DraftTeam (
    DraftTeamID  INTEGER PRIMARY KEY AUTOINCREMENT,
    LeagueName   TEXT NOT NULL,
    DivisionName TEXT NOT NULL,
    TeamKey      TEXT NOT NULL,   -- e.g. "team_0", "team_1"
    TeamData     TEXT NOT NULL,   -- full team JSON (teamName, players[], avg_skill, ...)
    CreatedAt    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (LeagueName, DivisionName, TeamKey)
);

CREATE INDEX IF NOT EXISTS idx_draftteam_league_div ON DraftTeam (LeagueName, DivisionName);
CREATE INDEX IF NOT EXISTS idx_game_status          ON Game (CurrentGameStatus);
CREATE INDEX IF NOT EXISTS idx_game_home_team       ON Game (HomeTeamID);
CREATE INDEX IF NOT EXISTS idx_game_away_team       ON Game (AwayTeamID);
CREATE INDEX IF NOT EXISTS idx_game_status_home     ON Game (CurrentGameStatus, HomeTeamID);
CREATE INDEX IF NOT EXISTS idx_game_status_away     ON Game (CurrentGameStatus, AwayTeamID);
CREATE INDEX IF NOT EXISTS idx_playerteam_season    ON PlayerTeam (SeasonID);
CREATE INDEX IF NOT EXISTS idx_playerteam_player    ON PlayerTeam (PlayerID);

-- Junction: which teams each player plays for
CREATE TABLE IF NOT EXISTS PlayerTeam (
    PlayerID INTEGER NOT NULL,
    TeamID   INTEGER NOT NULL,
    SeasonID INTEGER NOT NULL,
    PRIMARY KEY (PlayerID, TeamID, SeasonID),
    FOREIGN KEY (PlayerID) REFERENCES Player(PlayerID) ON DELETE CASCADE,
    FOREIGN KEY (TeamID)   REFERENCES Team(TeamID)     ON DELETE CASCADE
);

-- Junction: which players are on each scheduled team
CREATE TABLE IF NOT EXISTS ScheduledTeamPlayer (
    ScheduledTeamID INTEGER NOT NULL,
    PlayerID        INTEGER NOT NULL,
    PRIMARY KEY (ScheduledTeamID, PlayerID),
    FOREIGN KEY (ScheduledTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (PlayerID)        REFERENCES Player(PlayerID)
);
