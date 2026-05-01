-- MySQL schema for WEHA Hockey Scheduler

CREATE TABLE IF NOT EXISTS Admin (
    AdminID      INT NOT NULL AUTO_INCREMENT,
    Email        VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    PRIMARY KEY (AdminID)
);

CREATE TABLE IF NOT EXISTS League (
    LeagueID INT NOT NULL,
    Name     VARCHAR(255) NOT NULL UNIQUE,
    PRIMARY KEY (LeagueID)
);

CREATE TABLE IF NOT EXISTS Division (
    DivisionID INT NOT NULL,
    LeagueID   INT,
    Name       VARCHAR(255) NOT NULL,
    PRIMARY KEY (DivisionID),
    FOREIGN KEY (LeagueID) REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Team (
    TeamID      INT NOT NULL,
    DivisionID  INT NOT NULL,
    LeagueID    INT NOT NULL,
    Name        VARCHAR(255) NOT NULL,
    Wins        INT DEFAULT 0,
    Loses       INT DEFAULT 0,
    Ties        INT DEFAULT 0,
    GamesPlayed INT DEFAULT 0,
    PRIMARY KEY (TeamID),
    FOREIGN KEY (DivisionID) REFERENCES Division(DivisionID),
    FOREIGN KEY (LeagueID)   REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Season (
    SeasonID INT NOT NULL,
    LeagueID INT NOT NULL,
    Name     VARCHAR(255) NOT NULL,
    PRIMARY KEY (SeasonID),
    FOREIGN KEY (LeagueID) REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Player (
    PlayerID     INT NOT NULL AUTO_INCREMENT,
    FirstName    VARCHAR(255) NOT NULL,
    LastName     VARCHAR(255) NOT NULL,
    Position     VARCHAR(50),
    JerseyNumber VARCHAR(20),
    Goals        INT,
    Assists      INT,
    GamesPlayed  INT,
    Ppg          DOUBLE,
    Gaa          DOUBLE,
    PRIMARY KEY (PlayerID)
);

CREATE TABLE IF NOT EXISTS ScheduledTeam (
    ScheduledTeamID INT NOT NULL AUTO_INCREMENT,
    Name            VARCHAR(255) NOT NULL,
    LeagueID        INT NOT NULL,
    DivisionID      INT NOT NULL,
    SeasonID        INT NOT NULL,
    EnteredDate     VARCHAR(20),
    EnteredTime     VARCHAR(20),
    PRIMARY KEY (ScheduledTeamID),
    FOREIGN KEY (LeagueID)   REFERENCES League(LeagueID),
    FOREIGN KEY (DivisionID) REFERENCES Division(DivisionID),
    FOREIGN KEY (SeasonID)   REFERENCES Season(SeasonID)
);

CREATE TABLE IF NOT EXISTS Game (
    GameID            INT NOT NULL AUTO_INCREMENT,
    HomeTeamID        INT NOT NULL,
    AwayTeamID        INT NOT NULL,
    SeasonID          INT NOT NULL,
    HomeTeamScore     INT,
    AwayTeamScore     INT,
    GameDate          VARCHAR(20) NOT NULL,
    GameTime          VARCHAR(20) NOT NULL,
    Rink              VARCHAR(255),
    CurrentGameStatus VARCHAR(50) DEFAULT 'Draft',
    PRIMARY KEY (GameID),
    FOREIGN KEY (HomeTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (AwayTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (SeasonID)   REFERENCES Season(SeasonID)
);

CREATE TABLE IF NOT EXISTS DraftTeam (
    DraftTeamID  INT NOT NULL AUTO_INCREMENT,
    LeagueName   VARCHAR(255) NOT NULL,
    DivisionName VARCHAR(255) NOT NULL,
    TeamKey      VARCHAR(255) NOT NULL,
    TeamData     TEXT NOT NULL,
    CreatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (DraftTeamID),
    UNIQUE KEY uq_draft (LeagueName, DivisionName, TeamKey)
);

CREATE TABLE IF NOT EXISTS PlayerTeam (
    PlayerID INT NOT NULL,
    TeamID   INT NOT NULL,
    SeasonID INT NOT NULL,
    PRIMARY KEY (PlayerID, TeamID, SeasonID),
    FOREIGN KEY (PlayerID) REFERENCES Player(PlayerID) ON DELETE CASCADE,
    FOREIGN KEY (TeamID)   REFERENCES Team(TeamID)     ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ScheduledTeamPlayer (
    ScheduledTeamID INT NOT NULL,
    PlayerID        INT NOT NULL,
    PRIMARY KEY (ScheduledTeamID, PlayerID),
    FOREIGN KEY (ScheduledTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (PlayerID)        REFERENCES Player(PlayerID)
);

CREATE TABLE IF NOT EXISTS DeleteLog (
    LogID       INT NOT NULL AUTO_INCREMENT,
    EntityType  VARCHAR(50) NOT NULL,
    EntityID    INT NOT NULL,
    EntityName  VARCHAR(255),
    DeletedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Metadata    TEXT,
    PRIMARY KEY (LogID)
);

CREATE INDEX IF NOT EXISTS idx_draftteam_league_div ON DraftTeam (LeagueName, DivisionName);
CREATE INDEX IF NOT EXISTS idx_game_status          ON Game (CurrentGameStatus);
CREATE INDEX IF NOT EXISTS idx_game_home_team       ON Game (HomeTeamID);
CREATE INDEX IF NOT EXISTS idx_game_away_team       ON Game (AwayTeamID);
CREATE INDEX IF NOT EXISTS idx_game_status_home     ON Game (CurrentGameStatus, HomeTeamID);
CREATE INDEX IF NOT EXISTS idx_game_status_away     ON Game (CurrentGameStatus, AwayTeamID);
CREATE INDEX IF NOT EXISTS idx_playerteam_season    ON PlayerTeam (SeasonID);
CREATE INDEX IF NOT EXISTS idx_playerteam_player    ON PlayerTeam (PlayerID);
CREATE INDEX IF NOT EXISTS idx_deletelog_type       ON DeleteLog (EntityType);
CREATE INDEX IF NOT EXISTS idx_deletelog_at         ON DeleteLog (DeletedAt)
