import scrapy
import json

class PlayersSpider(scrapy.Spider):
    name = "players"

    ## Default Constructor
    def __init__(self, seasonID=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if seasonID is not None:
            self.seasonID = seasonID
        else:
            print("SEASON ID IS REQUIRED")
    
    async def start(self):
        yield scrapy.Request(
            url=f"https://gamesheetstats.com/api/usePlayers/getPlayerStandings/{self.seasonID}?filter[gametype]=overall&filter[sort]=-pts&filter[limit]=20&filter[offset]=0",
            callback=self.parse,
            cb_kwargs={"offset": 0}
        )

    def parse(self, response, offset):
        data = response.json()
        tableData = data.get("tableData")

        namesTableData = tableData["names"]
        teamsTableData = tableData["teamNames"]["data"]

        
        for p in range(len(namesTableData)):
            player = namesTableData[p]
            # This list handles the case for when a player plays for multiple teams
            currentPlayersTeams = teamsTableData[p] 
            # teamPlayer = teamsTableData[p]["title"]
            position = tableData["positions"]["data"][p]
            jerseyNumber = tableData["jersey"]["data"][p]
            playerGoals = tableData["g"]["data"][p]
            playerPtsPg = tableData["ptspg"]["data"][p] 
            playerPts = tableData["pts"]["data"][p]
            playerAssists = tableData["a"]["data"][p]
            playerGp = tableData["gp"]["data"][p]

            firstName = player["firstName"]
            lastName = player["lastName"]
            playerID = player["id"]
            for teams in currentPlayersTeams:
                teamId = teams["id"]  
                teamName = teams["title"]
                jerseyNumberOption = None

                # Check if jersey number is blank
                # If there is no jersey number than leave it blank
                if jerseyNumber == "-":
                    jerseyNumberOption = None
                # else use scrapy to yeild the jersey number 
                else:
                    jerseyNumberOption = jerseyNumber
                    
                positionOption = None

                # check if position has values
                # If the player data does contains values get the position in the list and asign it to positionOption    
                if position:
                    positionOption = position[0]
                # else leave position blank
                else:
                    positionOption = None

                # Yield Player info
                yield {
                    "itemType":"player",
                    "firstName": firstName,
                    "lastName": lastName,
                    "playerId": playerID,
                    "position": positionOption,
                    "jerseyNumber": jerseyNumberOption,
                    "goals":playerGoals,
                    "ptsPg":playerPtsPg,
                    "pts":playerPts,
                    "assists":playerAssists,
                    "gamesPlayed":playerGp,
                    "goalieGaa":None
                }
                
                # Yeild Player Team Info
                yield {
                    "itemType": "playerTeam",
                    "playerId": playerID,
                    "seasonId": self.seasonID,
                    "teamId": teamId,
                    "teamName": teamName,
                }
                    
        # print(f"Player Data: {playerPtsPg} , {playerPts} , {playerAssists}, {playerGp}")
        # Since filtering only gets first 20 results this acts like a cursor to get the next 20 items
        if len(namesTableData) == 20:
            nextOffset = offset + 20
            yield scrapy.Request(
                ## The urls index gamesheets api depending on season id. While offset is used to get the next page/query of data
                url=f"https://gamesheetstats.com/api/usePlayers/getPlayerStandings/{self.seasonID}?filter[gametype]=overall&filter[sort]=-pts&filter[limit]=20&filter[offset]={nextOffset}",
                callback=self.parse,
                cb_kwargs={"offset":nextOffset}
            )