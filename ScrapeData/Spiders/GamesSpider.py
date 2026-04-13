import scrapy

class GamesSpider(scrapy.Spider):
    name = "games"

    # Default Constructor
    def __init__(self, seasonID=None, seasonTitle=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.seasonTitle = seasonTitle
        if seasonID is not None:
            self.seasonID = seasonID
        else:
            print("SEASON ID IS REQUIRED")

    async def start(self):
        yield scrapy.Request(
            url=f"https://gamesheetstats.com/api/useStandings/getDivisionStandings/{self.seasonID}?filter[gametype]=overall&filter[limit]=1&filter[offset]=0&filter[timeZoneOffset]=-360",
            callback=self.parse,
            cb_kwargs={"offset": 0}
        )

    def parse(self, response, offset):
        data = response.json()
        try:
            tableDivLeague = list(data) 
            for i in range(len(tableDivLeague)):
                currentTeam = tableDivLeague[i]
                # print(f"Current Team {currentTeam}")                    
                combinedLeagueDivision = currentTeam["title"]
                splitList = combinedLeagueDivision.split(" - ")
                leagueName = None
                divisionName = None
                if len(splitList) == 2:
                    leagueName = splitList[0]
                    divisionName = splitList[1]
                else:
                    # If user inputted season title is not None
                    if self.seasonTitle:
                        leagueName = self.seasonTitle # Get first word user inputted seasonTitle

                    # Else Put Unknown as Season Title
                    else:
                        leagueName = "Unknown"
                    divisionName = splitList[0]
                print(f"League : {leagueName}, Divsion: {divisionName}")
                tableTeamData = currentTeam["tableData"]
                teamTitles = tableTeamData["teamTitles"]

                # Yield League Table Info
                yield {
                    "itemType" : "league",
                    "leagueName" : leagueName,
                }  

                # Yield Season Table Info
                yield{
                    "itemType": "season",
                    "seasonId": self.seasonID,
                    "leagueName": leagueName,
                    "seasonName": self.seasonTitle
                }

                # Yield Division Table Info
                yield {
                    "itemType": "division",
                    "divisionName": divisionName,
                    "leagueName": leagueName,
                }

                for j in range(len(teamTitles)):
                    teamName = teamTitles[j]["title"]
                    teamId = teamTitles[j]["id"]
                    gamesPlayed = tableTeamData["gp"][j]
                    wins = tableTeamData["w"][j]   
                    losses = tableTeamData["l"][j]
                    ties = tableTeamData["t"][j]
                    # print(f"Team {teamId}: {teamName}, Wins: {wins}, Loses: {loses}, Ties: {ties}, Games Played: {gamesPlayed}")
                    
                    # Yield Team Table Info
                    yield {
                        "itemType" : "team",
                        "leagueName" : leagueName,
                        "divisionName": divisionName,
                        "teamName": teamName,
                        "teamId": teamId,
                        "wins": wins,
                        "losses": losses,
                        "ties": ties,
                        "gamesPlayed": gamesPlayed
                    }
                    
                    
                    
        except Exception as e:
            print(f"ERROR : {e}")
        