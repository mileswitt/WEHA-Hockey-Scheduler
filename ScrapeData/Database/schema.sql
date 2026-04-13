CREATE SCHEMA IF NOT EXISTS weha_hockey_scheduler;

USE weha_hockey_scheduler;

CREATE TABLE IF NOT EXISTS `Admin`(
	AdminID INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    Email VARCHAR(250) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL
);
CREATE TABLE IF NOT EXISTS League(
	LeagueID INT PRIMARY KEY AUTO_INCREMENT,
    `Name` VARCHAR(110) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Division(
	DivisionID INT PRIMARY KEY AUTO_INCREMENT,
    LeagueID INT,
	`Name` VARCHAR(110) NOT NULL,
	FOREIGN KEY (LeagueID) REFERENCES League(LeagueID)
);
CREATE TABLE IF NOT EXISTS Team(
	TeamID INT PRIMARY KEY NOT NULL,
    DivisionID INT NOT NULL,
    LeagueID INT NOT NULL,
    `Name` VARCHAR(100) NOT NULL,
    Wins TINYINT UNSIGNED DEFAULT 0,
    Loses TINYINT UNSIGNED DEFAULT 0,
    `Ties` TINYINT UNSIGNED DEFAULT 0,
    GamesPlayed TINYINT UNSIGNED DEFAULT 0,
	FOREIGN KEY (DivisionID) REFERENCES Division(DivisionID),
	FOREIGN KEY (LeagueID) REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Season(
    SeasonID INT PRIMARY KEY NOT NULL,
    LeagueID INT NOT NULL,
    `Name` VARCHAR(100) NOT NULL,
    FOREIGN KEY (LeagueID) REFERENCES League(LeagueID)
);

CREATE TABLE IF NOT EXISTS Player(
	PlayerID INT PRIMARY KEY NOT NULL,
    FirstName VARCHAR(100) NOT NULL,
    LastName VARCHAR(150)  NOT NULL,
    `Position` VARCHAR(25) NULL,
    JerseyNumber VARCHAR(5) NULL, -- JerseyNumber is a VARCHAR instead of SMALLINT because Gamesheet stores some of this info as "-" if NULL
    Goals INT NULL,
    Assists INT NULL,
    GamesPlayed INT NULL,
    Ppg DECIMAL(4,2) NULL, -- Points Per Game
    Gaa DECIMAL(4,2) NULL -- Goals Against Average
);

CREATE TABLE IF NOT EXISTS ScheduledTeam(
    ScheduledTeamID INT PRIMARY KEY NOT NULL,
    `Name` VARCHAR(100) NOT NULL,
    LeagueID INT NOT NULL,
    DivisionID INT NOT NULL,
    SeasonID INT NOT NULL,
    EnteredByID INT NOT NULL,
    EnteredDate DATE NOT NULL,
    EnteredTime TIME NOT NULL,
    FOREIGN KEY (LeagueID) REFERENCES League(LeagueID),
    FOREIGN KEY (DivisionID) REFERENCES Division(DivisionID),
    FOREIGN KEY (SeasonID) REFERENCES Season(SeasonID),
    FOREIGN KEY (EnteredByID) REFERENCES `Admin`(AdminID) -- EnteredByID is which admin created the schedule
);


CREATE TABLE IF NOT EXISTS Game(
    GameID INT PRIMARY KEY NOT NULL,
    HomeTeamID INT NOT NULL,
    AwayTeamID INT NOT NULL,
    SeasonID INT NOT NULL,
    HomeTeamScore TINYINT NOT NULL,
    AwayTeamScore TINYINT NOT NULL,
    GameDate DATE NOT NULL,
    GameTime DATE NOT NULL,
    CurrentGameStatus VARCHAR(25) NULL DEFAULT 'Scheduled',
    FOREIGN KEY (HomeTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (AwayTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (SeasonID) REFERENCES Season(SeasonID)
);

-- Junction Table between Player and Team tables that shows which teams each player plays for
CREATE TABLE IF NOT EXISTS PlayerTeam(
	PlayerID INT NOT NULL,
    TeamID INT NOT NULL,
    SeasonID INT NOT NULL,
    PRIMARY KEY(PlayerID, TeamID, SeasonID),
    FOREIGN KEY (PlayerID) REFERENCES Player(PlayerID)
		ON DELETE CASCADE, -- If a player is deleted from the player table the cascade rule will drop them from the PlayerTeam junction table
    FOREIGN KEY (TeamID) REFERENCES Team(TeamID)
		ON DELETE CASCADE -- If a team is deleted from the team table the cascade rule will drop them from the PlayerTeam junction table
);


-- Junction Table between ScheduledTeam and Player shows which players are assigned to each scheduled team
CREATE TABLE IF NOT EXISTS ScheduledTeamPlayer(
    ScheduledTeamID INT NOT NULL,
    PlayerID INT NOT NULL,
    PRIMARY KEY(ScheduledTeamID, PlayerID),
    FOREIGN KEY (ScheduledTeamID) REFERENCES ScheduledTeam(ScheduledTeamID),
    FOREIGN KEY (PlayerID) REFERENCES Player(PlayerID)
);


-- FOR TESTING
-- Tuncate All Data in Tables and reset auto increment counter
-- SET FOREIGN_KEY_CHECKS = 0;
-- TRUNCATE TABLE ScheduledTeamPlayer;
-- TRUNCATE TABLE PlayerTeam;
-- TRUNCATE TABLE Game;
-- TRUNCATE TABLE ScheduledTeamPlayer;
-- TRUNCATE TABLE Player;
-- TRUNCATE TABLE Season;
-- TRUNCATE TABLE Team;
-- TRUNCATE TABLE Division;
-- TRUNCATE TABLE League;
-- SET FOREIGN_KEY_CHECKS = 1;

-- DROP ALL tables, starting with junction tables
-- DROP TABLE IF EXISTS ScheduledTeamPlayer;
-- DROP TABLE IF EXISTS PlayerTeam;
-- DROP TABLE IF EXISTS Game;
-- DROP TABLE IF EXISTS ScheduledTeam;
-- DROP TABLE IF EXISTS Player;
-- DROP TABLE IF EXISTS Season;
-- DROP TABLE IF EXISTS Team;
-- DROP TABLE IF EXISTS Division;
-- DROP TABLE IF EXISTS League;