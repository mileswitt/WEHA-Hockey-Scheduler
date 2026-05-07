"""
migrate_to_mysql.py
One-shot migration: creates the weha schema in MySQL and copies all data from the
existing SQLite database.  Run from the project root.
"""
import sqlite3
import mysql.connector
import os
import re

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "server", "data", "weha.db")

sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_conn.row_factory = sqlite3.Row

my = mysql.connector.connect(host="localhost", port=3306, user="root", password="")
cur = my.cursor()

# ── 0. Create / select database ───────────────────────────────────────────────
cur.execute("CREATE DATABASE IF NOT EXISTS weha CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
cur.execute("USE weha")
cur.execute("SET FOREIGN_KEY_CHECKS = 0")

# ── 1. Create tables ──────────────────────────────────────────────────────────
SCHEMA = """
CREATE TABLE IF NOT EXISTS Admin (
    AdminID      INT AUTO_INCREMENT PRIMARY KEY,
    Email        VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS League (
    LeagueID INT AUTO_INCREMENT PRIMARY KEY,
    Name     VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Division (
    DivisionID INT AUTO_INCREMENT PRIMARY KEY,
    LeagueID   INT,
    Name       VARCHAR(255) NOT NULL,
    FOREIGN KEY (LeagueID) REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Season (
    SeasonID INT PRIMARY KEY,
    LeagueID INT NOT NULL,
    Name     VARCHAR(255) NOT NULL,
    FOREIGN KEY (LeagueID) REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Team (
    TeamID      INT PRIMARY KEY,
    DivisionID  INT NOT NULL,
    LeagueID    INT NOT NULL,
    Name        VARCHAR(255) NOT NULL,
    Wins        INT DEFAULT 0,
    Loses       INT DEFAULT 0,
    Ties        INT DEFAULT 0,
    GamesPlayed INT DEFAULT 0,
    FOREIGN KEY (DivisionID) REFERENCES Division(DivisionID),
    FOREIGN KEY (LeagueID)   REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Player (
    PlayerID     INT PRIMARY KEY,
    FirstName    VARCHAR(255) NOT NULL,
    LastName     VARCHAR(255) NOT NULL,
    Position     VARCHAR(100),
    JerseyNumber VARCHAR(20),
    Goals        INT,
    Assists      INT,
    GamesPlayed  INT,
    Ppg          DOUBLE,
    Gaa          DOUBLE
);

CREATE TABLE IF NOT EXISTS PlayerTeam (
    PlayerID INT NOT NULL,
    TeamID   INT NOT NULL,
    SeasonID INT NOT NULL,
    PRIMARY KEY (PlayerID, TeamID, SeasonID),
    FOREIGN KEY (PlayerID) REFERENCES Player(PlayerID) ON DELETE CASCADE,
    FOREIGN KEY (TeamID)   REFERENCES Team(TeamID)     ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ScheduledTeam (
    ScheduledTeamID INT AUTO_INCREMENT PRIMARY KEY,
    Name            VARCHAR(255) NOT NULL,
    LeagueID        INT NOT NULL,
    DivisionID      INT NOT NULL,
    SeasonID        INT NOT NULL,
    EnteredDate     DATE,
    EnteredTime     TIME,
    FOREIGN KEY (LeagueID)   REFERENCES League(LeagueID),
    FOREIGN KEY (DivisionID) REFERENCES Division(DivisionID),
    FOREIGN KEY (SeasonID)   REFERENCES Season(SeasonID)
);

CREATE TABLE IF NOT EXISTS ScheduledTeamPlayer (
    ScheduledTeamID INT NOT NULL,
    PlayerID        INT NOT NULL,
    PRIMARY KEY (ScheduledTeamID, PlayerID),
    FOREIGN KEY (ScheduledTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (PlayerID)        REFERENCES Player(PlayerID)
);

CREATE TABLE IF NOT EXISTS Game (
    GameID            INT AUTO_INCREMENT PRIMARY KEY,
    HomeTeamID        INT NOT NULL,
    AwayTeamID        INT NOT NULL,
    SeasonID          INT NOT NULL,
    HomeTeamScore     INT,
    AwayTeamScore     INT,
    GameDate          VARCHAR(20) NOT NULL,
    GameTime          VARCHAR(20) NOT NULL,
    Rink              VARCHAR(255),
    CurrentGameStatus VARCHAR(20) DEFAULT 'Draft',
    FOREIGN KEY (HomeTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (AwayTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (SeasonID)   REFERENCES Season(SeasonID)
);

CREATE TABLE IF NOT EXISTS DraftTeam (
    DraftTeamID  INT AUTO_INCREMENT PRIMARY KEY,
    LeagueName   VARCHAR(255) NOT NULL,
    DivisionName VARCHAR(255) NOT NULL,
    TeamKey      VARCHAR(50)  NOT NULL,
    TeamData     LONGTEXT     NOT NULL,
    CreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (LeagueName, DivisionName, TeamKey)
);
"""

for stmt in SCHEMA.split(";"):
    stmt = stmt.strip()
    if stmt and not stmt.startswith("--"):
        cur.execute(stmt)
my.commit()

# Game status index — ignore if already exists
try:
    cur.execute("CREATE INDEX idx_game_status ON Game (CurrentGameStatus)")
    my.commit()
except mysql.connector.errors.DatabaseError:
    pass  # index already exists

print("Schema created.")


# ── 2. Helper ────────────────────────────────────────────────────────────────
def fix_time(val):
    """Convert '08:00:24.329Z' → '08:00:24' for MySQL TIME columns."""
    if val is None:
        return None
    return re.sub(r'\.\d+Z?$', '', val).replace('Z', '')


def copy(table, select_sql, insert_sql, transform=None):
    rows = sqlite_conn.execute(select_sql).fetchall()
    if not rows:
        print(f"{table}: 0 rows (skipped)")
        return
    data = [transform(r) if transform else tuple(r) for r in rows]
    cur.executemany(insert_sql, data)
    my.commit()
    print(f"{table}: {len(data)} rows inserted")


# ── 3. Migrate each table ────────────────────────────────────────────────────

copy("Admin",
    "SELECT AdminID, Email, PasswordHash FROM Admin",
    "INSERT IGNORE INTO Admin (AdminID, Email, PasswordHash) VALUES (%s,%s,%s)")

copy("League",
    "SELECT LeagueID, Name FROM League",
    "INSERT IGNORE INTO League (LeagueID, Name) VALUES (%s,%s)")

copy("Division",
    "SELECT DivisionID, LeagueID, Name FROM Division",
    "INSERT IGNORE INTO Division (DivisionID, LeagueID, Name) VALUES (%s,%s,%s)")

copy("Season",
    "SELECT SeasonID, LeagueID, Name FROM Season",
    "INSERT IGNORE INTO Season (SeasonID, LeagueID, Name) VALUES (%s,%s,%s)")

copy("Team",
    "SELECT TeamID, DivisionID, LeagueID, Name, Wins, Loses, Ties, GamesPlayed FROM Team",
    "INSERT IGNORE INTO Team (TeamID, DivisionID, LeagueID, Name, Wins, Loses, Ties, GamesPlayed) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)")

copy("Player",
    "SELECT PlayerID, FirstName, LastName, Position, JerseyNumber, Goals, Assists, GamesPlayed, Ppg, Gaa FROM Player",
    "INSERT IGNORE INTO Player (PlayerID, FirstName, LastName, Position, JerseyNumber, Goals, Assists, GamesPlayed, Ppg, Gaa) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)")

copy("PlayerTeam",
    "SELECT PlayerID, TeamID, SeasonID FROM PlayerTeam",
    "INSERT IGNORE INTO PlayerTeam (PlayerID, TeamID, SeasonID) VALUES (%s,%s,%s)")

copy("ScheduledTeam",
    "SELECT ScheduledTeamID, Name, LeagueID, DivisionID, SeasonID, EnteredDate, EnteredTime FROM ScheduledTeam",
    "INSERT IGNORE INTO ScheduledTeam (ScheduledTeamID, Name, LeagueID, DivisionID, SeasonID, EnteredDate, EnteredTime) VALUES (%s,%s,%s,%s,%s,%s,%s)",
    transform=lambda r: (r[0], r[1], r[2], r[3], r[4], r[5], fix_time(r[6])))

copy("ScheduledTeamPlayer",
    "SELECT ScheduledTeamID, PlayerID FROM ScheduledTeamPlayer",
    "INSERT IGNORE INTO ScheduledTeamPlayer (ScheduledTeamID, PlayerID) VALUES (%s,%s)")

copy("Game",
    "SELECT GameID, HomeTeamID, AwayTeamID, SeasonID, HomeTeamScore, AwayTeamScore, GameDate, GameTime, Rink, CurrentGameStatus FROM Game",
    "INSERT IGNORE INTO Game (GameID, HomeTeamID, AwayTeamID, SeasonID, HomeTeamScore, AwayTeamScore, GameDate, GameTime, Rink, CurrentGameStatus) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)")

copy("DraftTeam",
    "SELECT DraftTeamID, LeagueName, DivisionName, TeamKey, TeamData, CreatedAt FROM DraftTeam",
    "INSERT IGNORE INTO DraftTeam (DraftTeamID, LeagueName, DivisionName, TeamKey, TeamData, CreatedAt) VALUES (%s,%s,%s,%s,%s,%s)")

cur.execute("SET FOREIGN_KEY_CHECKS = 1")
my.commit()
sqlite_conn.close()
my.close()
print("\nMigration complete. All data is now in MySQL.")
