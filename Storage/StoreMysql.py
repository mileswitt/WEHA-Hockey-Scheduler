from Storage.ModelMysql import MysqlModel

class MysqlStorage():
    def open_spider(self, spider):
        # Initialize Mysql Model
        self.Model = MysqlModel()
        if self.Model.connection is None:
            raise RuntimeError("Failed to connect to MySQL database — check credentials and SSL config")
        print("Connected to Mysql Database")

    # This function handles taking what the web scraping spiders found and extracting them from the item dictionary from each spiders yield objects
    # After the fields are extracted they are used to determine what kind of item is found for inserting into the correct database tables
    def process_item(self, item, spider):
        extractedItem = dict(item)
        try:
            match(extractedItem.get("itemType")):
                case "player":
                    self.Model.InsertPlayer(
                        playerId=extractedItem.get("playerId"),
                        firstName=extractedItem.get("firstName"),
                        lastName=extractedItem.get("lastName"),
                        position=extractedItem.get("position"),
                        jerseyNumber=extractedItem.get("jerseyNumber"),
                        goals=extractedItem.get("goals"),
                        assists=extractedItem.get("assists"),
                        gamesPlayed=extractedItem.get("gamesPlayed"),
                        ppg=extractedItem.get("ptsPg"),
                        gaa=extractedItem.get("goalieGaa"),
                    )
                case "playerTeam":
                    self.Model.InsertPlayerTeam(
                        playerId=extractedItem.get("playerId"),
                        teamName=extractedItem.get("teamName"),
                        teamId=extractedItem.get("teamId"),
                        seasonId=extractedItem.get("seasonId"),
                    )
                case "league":
                    self.Model.InsertLeague(LeagueName=extractedItem.get("leagueName"))
                case "division":
                    self.Model.InsertDivision(DivisionName=extractedItem.get("divisionName"),LeagueName=extractedItem.get("leagueName"))
                case "team":
                    self.Model.InsertTeam(
                        teamId=extractedItem.get("teamId"),
                        divisionName=extractedItem.get("divisionName"),
                        leagueName=extractedItem.get("leagueName"),
                        teamName=extractedItem.get("teamName"),
                        wins=extractedItem.get("wins"),
                        loses=extractedItem.get("loses"),
                        ties=extractedItem.get("ties"),
                        gamesPlayed=extractedItem.get("gamesPlayed")
                    )
                case "season":
                    self.Model.InsertSeason(
                        seasonId=extractedItem.get("seasonId"),
                        seasonName=extractedItem.get("seasonName"),
                        leagueName=extractedItem.get("leagueName")
                    )
        except Exception as e:
            print(f"ERROR: {e}")
            raise e
        return item
    def close_spider(self, spider):
        self.Model.DisconnectDB()
        print("Disconnected From Database")