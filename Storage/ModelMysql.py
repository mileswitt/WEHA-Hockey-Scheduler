from Storage.ConnectionMysql import Connection

class MysqlModel():
    def __init__(self):
        self.connection, self.cursor = Connection().MysqlConnection()

    # Player Table Columns:
    # firstName,lastName,playerId,teamName,teamId,position,jerseyNumber,goals,assists,gp,gaa
    def InsertPlayer(self, playerId, firstName, lastName, position, jerseyNumber,goals,assists,gamesPlayed,ppg,gaa):
            self.cursor.execute("""
                INSERT INTO Player (PlayerID, FirstName, LastName, Position, JerseyNumber, Goals, Assists, GamesPlayed, Ppg ,Gaa)
                VALUES (%s ,%s ,%s ,%s ,%s ,%s ,%s ,%s ,%s, %s)
                ON DUPLICATE KEY UPDATE
                    FirstName = VALUES(FirstName),
                    LastName = VALUES(LastName),
                    Position = VALUES(Position),
                    JerseyNumber = VALUES(JerseyNumber),
                    Goals = VALUES(Goals),
                    Assists = VALUES(Assists),    
                    GamesPlayed = VALUES(GamesPlayed),
                    Ppg = VALUES(Ppg),
                    Gaa = VALUES(Gaa)                        
            """, (playerId ,firstName ,lastName ,position ,jerseyNumber ,goals ,assists ,gamesPlayed, ppg ,gaa))
            self.connection.commit()

    def InsertLeague(self, LeagueName):
        # Check if the league id exists, this is so the auto_increment id is not incremented during multiple seasons league item yields
        self.cursor.execute("""
            SELECT LeagueID FROM League WHERE `Name` = %s
        """, (LeagueName,))
        resultLeagueName = self.cursor.fetchone() # Only fetch one leagues id number, with name equal to current web scrapers league name
        
        # If the league results return no values then the league name can be added to the database
        if resultLeagueName is None:
            self.cursor.execute("""
                INSERT INTO League (`Name`)
                VALUES (%s)
            """, (LeagueName,))
            self.connection.commit()
        # Else the league result returns a value, meaning it is in the database already and doesn't need to be inserted
        else:
            pass

    def InsertDivision(self, DivisionName, LeagueName):
        self.cursor.execute("""
            SELECT LeagueID FROM League WHERE `Name` = %s
        """, (LeagueName,))
        resultLeagueID = self.cursor.fetchone()

        # If League ID found in database then insert into divison table
        if resultLeagueID is not None:
            getLeagueID = resultLeagueID[0] # Extract only leagueID from result query

            self.cursor.execute("""
                SELECT DivisionID FROM Division WHERE `Name` = %s and LeagueID = %s
            """, (DivisionName,getLeagueID))

            resutlDivisionId = self.cursor.fetchone() # query database for division by name returninf division id if found

            # If current division name does not exist in database, then insert into division table
            if resutlDivisionId is None:
                self.cursor.execute("""
                    INSERT INTO Division (`LeagueID`,`Name`)
                    VALUES(%s ,%s)
                """, (getLeagueID,DivisionName))
                self.connection.commit()
            # Else don't insert into division table
            else:
                pass

    def InsertTeam(self, teamId, divisionName, leagueName, teamName, wins, loses, ties, gamesPlayed):
        self.cursor.execute("SELECT LeagueID FROM League WHERE `Name` = %s",(leagueName,))
        resultLeague = self.cursor.fetchone()
        self.cursor.execute("SELECT DivisionID FROM Division WHERE `Name` = %s and LeagueID = %s",(divisionName,resultLeague[0]))
        resultDivision = self.cursor.fetchone()
        
        # Check if league name and division name exists in database
        if resultDivision is not None and resultLeague is not None:
            getDivisionId = resultDivision[0] # get league id using league name scraped
            getLeagueId = resultLeague[0] # get division id using division name scraped
            
            # Using gamesheet teamid that was scraped check in database to see if it exists
            self.cursor.execute("""
                SELECT TeamID from Team WHERE `TeamID` = %s
            """, (teamId,))

            resultTeamName = self.cursor.fetchone() # this will return a teamID if the team id is already in the database
            # If teamName is not in database insert team
            if resultTeamName is None:
                self.cursor.execute("""
                    INSERT INTO Team(TeamID, DivisionID, LeagueID, `Name`, Wins, Loses, Ties, GamesPlayed)
                    VALUES(%s, %s, %s, %s, %s, %s, %s ,%s)
                """,(teamId ,getDivisionId ,getLeagueId ,teamName ,wins ,loses, ties, gamesPlayed))
                self.connection.commit()

            # Else don't add to the team table and instead update current database values
            else:
                self.cursor.execute("""
                    UPDATE Team
                    SET wins=%s ,loses=%s ,ties=%s ,GamesPlayed=%s
                    WHERE TeamID = %s
                """,(wins, loses, ties, gamesPlayed, teamId))
                self.connection.commit()
    def InsertSeason(self, seasonId, seasonName, leagueName):
        self.cursor.execute("SELECT LeagueID FROM League WHERE `Name` = %s",(leagueName,))
        resultLeagueName = self.cursor.fetchone() # find league id by name
        # If the current league name exists in the database then insert into season table
        if resultLeagueName is not None:
            getLeagueId = resultLeagueName[0] # extract league id from query for season table insert

            # Check if season already exists with a valid leagueID
            self.cursor.execute("SELECT SeasonID FROM Season WHERE SeasonID = %s",(seasonId,))
            resultSeason = self.cursor.fetchone() 
            
            # if season does not exist then insert new season data into table
            if resultSeason is None:      
                self.cursor.execute("""
                    INSERT INTO Season(SeasonID, LeagueID, `Name`)
                    VALUES(%s ,%s ,%s)
                """,(seasonId ,getLeagueId ,seasonName))
                self.connection.commit()    
            # Else do not insert new data into the table   
            else:
                pass
    # There are 2 spiders that use this function to insert into the playerteam table, GoalieSpider and PlayerSpider, 
    # so in order to prevent a race condition the spider uses a INSERT IGNORE INTO so when the spiders are inserting
    #  into the same row they don't struggle to use the same resource. 
    def InsertPlayerTeam(self, playerId, teamName, teamId, seasonId):
        self.cursor.execute("SELECT TeamID FROM Team WHERE `Name` = %s and TeamID = %s",(teamName,teamId))
        resultTeam = self.cursor.fetchone()

        # Check if the team exists in the team table
        if resultTeam is not None:
            getTeamId = resultTeam[0]
            # Check if seasonid exists
            self.cursor.execute("SELECT SeasonID FROM Season WHERE SeasonID = %s",(seasonId,))
            resultSeason = self.cursor.fetchone()
            if resultSeason is not None:
                # Check if player team exists if it does dont add to database
                self.cursor.execute("SELECT PlayerID FROM PlayerTeam WHERE PlayerID = %s and TeamID = %s and SeasonID = %s ",(playerId,teamId,seasonId))
                resultPlayer = self.cursor.fetchone()
                self.cursor.execute("""
                    INSERT IGNORE INTO PlayerTeam(PlayerID, TeamID, SeasonID)
                    VALUES(%s ,%s ,%s)
                """, (playerId, getTeamId, seasonId))
                self.connection.commit()

    def DisconnectDB(self):
        Connection().MysqlDisconnect(self.connection, self.cursor)