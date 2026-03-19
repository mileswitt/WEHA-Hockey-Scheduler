import scrapy

class GamesSpider(scrapy.Spider):
    name = "games"

    # Default Constructor
    def __init__(self, userInputSeasonID=None, seasonTitle=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.seasonTitle = seasonTitle
        if userInputSeasonID is not None:
            self.userInputSeasonID = userInputSeasonID
        else:
            print("SEASON ID IS REQUIRED")

    def start_requests(self):
        yield scrapy.Request(
            url=f"https://gamesheetstats.com/api/useStandings/getDivisionStandings/{self.userInputSeasonID}?filter[gametype]=overall&filter[limit]=1&filter[offset]=0&filter[timeZoneOffset]=-360",
            callback=self.parse,
            cb_kwargs={"offset": 0}
        )

    def parse(self, response, offset):
        data = response.json()
        try:
            tableDivLeague = list(data) 
            for i in range(len(tableDivLeague)):
                currentTeam = tableDivLeague[i]
                print(f"Current Team {currentTeam}")                    
                combinedLeagueDivision = currentTeam["title"]
                splitList = combinedLeagueDivision.split(" - ")
                league = None
                division = None
                if len(splitList) == 2:
                    league = splitList[0]
                    division = splitList[1]
                else:
                    # If user inputted season title is not None
                    if self.seasonTitle:
                        league = self.seasonTitle.split(" - ")[0] # Get first word user inputted seasonTitle
                    # Else Put Unknown as Season Title
                    else:
                        league = "Unknown"
                    division = splitList[0]
                # print(f"League : {league}, Divsion: {division}")
                tableTeamData = currentTeam["tableData"]
                teamTitles = tableTeamData["teamTitles"]

                for j in range(len(teamTitles)):
                    teamName = teamTitles[j]["title"]
                    teamId = teamTitles[j]["id"]
                    gamesPlayed = tableTeamData["gp"][j]
                    wins = tableTeamData["w"][j]   
                    loses = tableTeamData["l"][j]
                    ties = tableTeamData["t"][j]
                    # print(f"Team {teamId}: {teamName}, Wins: {wins}, Loses: {loses}, Ties: {ties}, Games Played: {gamesPlayed}")
                    yield {
                        "league" : league,
                        "division": division,
                        "teamName": teamName,
                        "teamId": teamId,
                        "wins": wins,
                        "loses": loses,
                        "ties": ties,
                        "gamesPlayed": gamesPlayed
                    }
                    
        except Exception as e:
            print(f"ERROR : {e}")
        