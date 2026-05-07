"""
StoreMySQL.py — Scrapy item pipeline that writes scraped data into the
project's MySQL database.
"""

import os
import threading
import mysql.connector
from dotenv import load_dotenv

load_dotenv(os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")))


class MySQLStorage:
    def open_spider(self, spider=None):
        self.lock = threading.Lock()
        self.conn = mysql.connector.connect(
            host=os.environ.get("MYSQL_HOST", "localhost"),
            port=int(os.environ.get("MYSQL_PORT", 3306)),
            user=os.environ.get("MYSQL_USER", "root"),
            password=os.environ.get("MYSQL_PASSWORD", ""),
            database=os.environ.get("MYSQL_DATABASE", "weha"),
        )
        self.conn.autocommit = False
        print(f"[MySQLStorage] Connected to: {os.environ.get('MYSQL_DATABASE', 'weha')} @ {os.environ.get('MYSQL_HOST', 'localhost')}")

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
            print(f"[MySQLStorage] ERROR processing item: {e}")
            raise e
        return item

    def _cursor(self):
        return self.conn.cursor()

    def _insert_player(self, item):
        cur = self._cursor()
        cur.execute("""
            INSERT INTO Player
                (PlayerID, FirstName, LastName, Position, JerseyNumber,
                 Goals, Assists, GamesPlayed, Ppg, Gaa)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                FirstName=VALUES(FirstName), LastName=VALUES(LastName),
                Position=VALUES(Position), JerseyNumber=VALUES(JerseyNumber),
                Goals=VALUES(Goals), Assists=VALUES(Assists),
                GamesPlayed=VALUES(GamesPlayed), Ppg=VALUES(Ppg), Gaa=VALUES(Gaa)
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
        cur = self._cursor()
        cur.execute(
            "INSERT IGNORE INTO League (Name) VALUES (%s)",
            (item.get("leagueName"),)
        )
        self.conn.commit()

    def _insert_division(self, item):
        cur = self._cursor()
        cur.execute(
            "SELECT LeagueID FROM League WHERE Name = %s",
            (item.get("leagueName"),)
        )
        row = cur.fetchone()
        if not row:
            return
        league_id = row[0]
        cur.execute(
            "SELECT DivisionID FROM Division WHERE Name = %s AND LeagueID = %s",
            (item.get("divisionName"), league_id)
        )
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO Division (LeagueID, Name) VALUES (%s, %s)",
                (league_id, item.get("divisionName"))
            )
            self.conn.commit()

    def _insert_team(self, item):
        cur = self._cursor()
        cur.execute(
            "SELECT LeagueID FROM League WHERE Name = %s",
            (item.get("leagueName"),)
        )
        league_row = cur.fetchone()
        if not league_row:
            return
        cur.execute(
            "SELECT DivisionID FROM Division WHERE Name = %s AND LeagueID = %s",
            (item.get("divisionName"), league_row[0])
        )
        div_row = cur.fetchone()
        if not div_row:
            return
        cur.execute(
            "SELECT TeamID FROM Team WHERE TeamID = %s",
            (item.get("teamId"),)
        )
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO Team (TeamID, DivisionID, LeagueID, Name, Wins, Loses, Ties, GamesPlayed)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                item.get("teamId"), div_row[0], league_row[0],
                item.get("teamName"), item.get("wins"),
                item.get("losses"), item.get("ties"), item.get("gamesPlayed"),
            ))
        else:
            cur.execute("""
                UPDATE Team SET Wins=%s, Loses=%s, Ties=%s, GamesPlayed=%s WHERE TeamID=%s
            """, (
                item.get("wins"), item.get("losses"),
                item.get("ties"), item.get("gamesPlayed"), item.get("teamId"),
            ))
        self.conn.commit()

    def _insert_season(self, item):
        cur = self._cursor()
        cur.execute(
            "SELECT LeagueID FROM League WHERE Name = %s",
            (item.get("leagueName"),)
        )
        league_row = cur.fetchone()
        if not league_row:
            return
        cur.execute(
            "SELECT SeasonID FROM Season WHERE SeasonID = %s",
            (item.get("seasonId"),)
        )
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO Season (SeasonID, LeagueID, Name) VALUES (%s, %s, %s)",
                (item.get("seasonId"), league_row[0], item.get("seasonName"))
            )
            self.conn.commit()

    def _insert_player_team(self, item):
        cur = self._cursor()
        cur.execute(
            "SELECT TeamID FROM Team WHERE TeamID = %s",
            (item.get("teamId"),)
        )
        team_row = cur.fetchone()
        cur.execute(
            "SELECT SeasonID FROM Season WHERE SeasonID = %s",
            (item.get("seasonId"),)
        )
        season_row = cur.fetchone()
        if team_row and season_row:
            cur.execute("""
                INSERT IGNORE INTO PlayerTeam (PlayerID, TeamID, SeasonID)
                VALUES (%s, %s, %s)
            """, (item.get("playerId"), item.get("teamId"), item.get("seasonId")))
            self.conn.commit()

    def close_spider(self, spider=None):
        self.conn.close()
        print("[MySQLStorage] Disconnected from MySQL")
