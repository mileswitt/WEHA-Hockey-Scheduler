import os
import sqlite3
import threading

DB_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "server", "data", "weha.db")
)


class SqliteStorage:
    def open_spider(self, spider=None):
        self.lock = threading.Lock()
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        print(f"[SqliteStorage] Connected to: {DB_PATH}")

    def process_item(self, item, spider=None):
        extracted = dict(item)
        try:
            with self.lock:
                match extracted.get("itemType"):
                    case "player":
                        self._insert_player(extracted)
                    case "playerTeam":
                        self._insert_player_team(extracted)
                    case "league":
                        self._insert_league(extracted)
                    case "division":
                        self._insert_division(extracted)
                    case "team":
                        self._insert_team(extracted)
                    case "season":
                        self._insert_season(extracted)
        except Exception as e:
            print(f"[SqliteStorage] ERROR processing item: {e}")
            raise e
        return item

    def _insert_player(self, item):
        self.conn.execute("""
            INSERT OR REPLACE INTO Player
                (PlayerID, FirstName, LastName, Position, JerseyNumber,
                 Goals, Assists, GamesPlayed, Ppg, Gaa)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item.get("playerId"),
            item.get("firstName"),
            item.get("lastName"),
            item.get("position"),
            item.get("jerseyNumber"),
            item.get("goals"),
            item.get("assists"),
            item.get("gamesPlayed"),
            item.get("ptsPg"),
            item.get("goalieGaa"),
        ))
        self.conn.commit()

    def _insert_league(self, item):
        self.conn.execute(
            "INSERT OR IGNORE INTO League (Name) VALUES (?)",
            (item.get("leagueName"),)
        )
        self.conn.commit()

    def _insert_division(self, item):
        row = self.conn.execute(
            "SELECT LeagueID FROM League WHERE Name = ?",
            (item.get("leagueName"),)
        ).fetchone()
        if not row:
            return
        league_id = row[0]
        exists = self.conn.execute(
            "SELECT DivisionID FROM Division WHERE Name = ? AND LeagueID = ?",
            (item.get("divisionName"), league_id)
        ).fetchone()
        if not exists:
            self.conn.execute(
                "INSERT INTO Division (LeagueID, Name) VALUES (?, ?)",
                (league_id, item.get("divisionName"))
            )
            self.conn.commit()

    def _insert_team(self, item):
        league_row = self.conn.execute(
            "SELECT LeagueID FROM League WHERE Name = ?",
            (item.get("leagueName"),)
        ).fetchone()
        if not league_row:
            return
        div_row = self.conn.execute(
            "SELECT DivisionID FROM Division WHERE Name = ? AND LeagueID = ?",
            (item.get("divisionName"), league_row[0])
        ).fetchone()
        if not div_row:
            return
        exists = self.conn.execute(
            "SELECT TeamID FROM Team WHERE TeamID = ?",
            (item.get("teamId"),)
        ).fetchone()
        if not exists:
            self.conn.execute("""
                INSERT INTO Team (TeamID, DivisionID, LeagueID, Name, Wins, Loses, Ties, GamesPlayed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item.get("teamId"), div_row[0], league_row[0],
                item.get("teamName"), item.get("wins"),
                item.get("losses"), item.get("ties"), item.get("gamesPlayed"),
            ))
        else:
            self.conn.execute("""
                UPDATE Team SET Wins=?, Loses=?, Ties=?, GamesPlayed=? WHERE TeamID=?
            """, (
                item.get("wins"), item.get("losses"),
                item.get("ties"), item.get("gamesPlayed"), item.get("teamId"),
            ))
        self.conn.commit()

    def _insert_season(self, item):
        league_row = self.conn.execute(
            "SELECT LeagueID FROM League WHERE Name = ?",
            (item.get("leagueName"),)
        ).fetchone()
        if not league_row:
            return
        exists = self.conn.execute(
            "SELECT SeasonID FROM Season WHERE SeasonID = ?",
            (item.get("seasonId"),)
        ).fetchone()
        if not exists:
            self.conn.execute(
                "INSERT INTO Season (SeasonID, LeagueID, Name) VALUES (?, ?, ?)",
                (item.get("seasonId"), league_row[0], item.get("seasonName"))
            )
            self.conn.commit()

    def _insert_player_team(self, item):
        team_row = self.conn.execute(
            "SELECT TeamID FROM Team WHERE TeamID = ?",
            (item.get("teamId"),)
        ).fetchone()
        season_row = self.conn.execute(
            "SELECT SeasonID FROM Season WHERE SeasonID = ?",
            (item.get("seasonId"),)
        ).fetchone()
        if team_row and season_row:
            self.conn.execute("""
                INSERT OR IGNORE INTO PlayerTeam (PlayerID, TeamID, SeasonID)
                VALUES (?, ?, ?)
            """, (item.get("playerId"), item.get("teamId"), item.get("seasonId")))
            self.conn.commit()

    def close_spider(self, spider=None):
        self.conn.close()
        print("[SqliteStorage] Disconnected from SQLite")
