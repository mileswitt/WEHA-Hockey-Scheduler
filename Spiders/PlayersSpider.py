import scrapy

class PlayersSpider(scrapy.Spider):
    name = "players"

    ## Default Constructor
    def __init__(self, userInputSeasonID=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if userInputSeasonID is not None:
            self.userInputSeasonID = userInputSeasonID
        else:
            print("SEASON ID IS REQUIRED")
    
    def start_requests(self):
        yield scrapy.Request(
            url=f"https://gamesheetstats.com/api/usePlayers/getPlayerStandings/{self.userInputSeasonID}?filter[gametype]=overall&filter[sort]=-pts&filter[limit]=20&filter[offset]=0",
            callback=self.parse,
            cb_kwargs={"offset": 0}
        )

    def parse(self, response, offset):
        data = response.json()
        # players = data.get("players") or data.get("data") or data
        tableData = data.get("tableData")
        keys = list(tableData.keys())
        values  = list(tableData.values())

        namesTableData = tableData["names"]
        teamsTableData = tableData["teamNames"]["data"]

        # print("Keys: ", keys)
        # print("Values: ", values)
        
        for p in range(len(namesTableData)):
            player = namesTableData[p]
            teamPlayer = teamsTableData[p][0]["title"]
            position = tableData["positions"]["data"][p]
            jerseyNumber = tableData["jersey"]["data"][p]
            firstName = player["firstName"]
            lastName = player["lastName"]
            playerID = player["id"]

            # try:
            #     print(f"Players Data:\n {playerID} , {firstName} , {lastName} , {teamPlayer}, {position[0]} , {jerseyNumber}")    
            # except Exception as e:
            #     print("No Position or Jersey Number Found")

            yield{
                "firstName": firstName,
                "lastName": lastName,
                "playerId": playerID,
                "teamName": teamPlayer,
                "position": position[0] if position else None,
                "jerseyNumber": jerseyNumber
            }    
        
        # Since filtering only gets first 20 results this acts like a cursor to get the next 20 items
        if len(namesTableData) == 20:
            nextOffset = offset + 20
            yield scrapy.Request(
                ## This url also works this depends on season id
                # url=f"https://gamesheetstats.com/api/usePlayers/getPlayerStandings/11615?filter[gametype]=overall&filter[sort]=-pts&filter[limit]=20&filter[offset]={nextOffset}",
                # url=f"https://gamesheetstats.com/api/usePlayers/getPlayerStandings/11383?filter[gametype]=overall&filter[sort]=-pts&filter[limit]=20&filter[offset]={nextOffset}",

                url=f"https://gamesheetstats.com/api/usePlayers/getPlayerStandings/{self.userInputSeasonID}?filter[gametype]=overall&filter[sort]=-pts&filter[limit]=20&filter[offset]={nextOffset}",
                callback=self.parse,
                cb_kwargs={"offset":nextOffset}
            )