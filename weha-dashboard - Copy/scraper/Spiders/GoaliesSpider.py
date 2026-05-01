import scrapy
import json

class GoaliesSpider(scrapy.Spider):
    name = "goalies"
    def __init__(self, seasonID=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if seasonID is not None:
            self.seasonID = seasonID
        else:
            print("SEASON ID IS REQUIRED")

    async def start(self):
        yield scrapy.Request(
            url=f"https://gamesheetstats.com/api/useGoalies/getGoalieStandings/{self.seasonID}?filter[gametype]=overall&filter[sort]=gaa&filter[limit]=20&filter[offset]=0",
            callback=self.parse,
            cb_kwargs={"offset": 0}
        )
    
    def parse(self, response, offset):
        if response.status == 200:
            data = response.json()
            # this goes into the main structure of the json getting all data from the stats table api
            goalieTableData = data["tableData"]
            # this layer of the json contains goalie first and last names
            goalieNamesData = goalieTableData["names"]
            # print(json.dumps(goalieTableData, indent=4, sort_keys=True))
            # this gets a list of teams a goalie plays or has played for
            goalieTeamsData = goalieTableData["teamNames"]["data"]
            # this gets a list of jersey numbers
            goalieJerseyData = goalieTableData["jersey"]["data"]
            # this gets a list of goals against average(this is useful for balanced teams)
            goalieGaaData = goalieTableData["gaa"]["data"]

            goalieGpData = goalieTableData["gp"]["data"]
            
            for goalie in range(len(goalieNamesData)):
                # This gets each goalie from the json iterating through each individual persons stats/info
                goalieNames = goalieNamesData[goalie]
                firstName = goalieNames["firstName"]
                lastName = goalieNames["lastName"]
                goalieId = goalieNames["id"]

                goalieJerseyNumber = goalieJerseyData[goalie]    
                goalieGaa = goalieGaaData[goalie]
                goalieGp = goalieGpData[goalie]

                # This loop is to get the team data for each team the goalie played as well as each statistic
                for team in goalieTeamsData[goalie]:
                    goalieTeamName = team["title"]
                    goalieTeamId = team["id"]  
                    # print(f"Team(s) Played for: {goalieTeamName,goalieTeamId,goalieJerseyNumber,goalieGaa}")

                    goalieJerseyNumOption = None

                    # Check if goalie has jersey number
                    if goalieJerseyNumber == "-":
                        goalieJerseyNumOption = None
                    else:
                        goalieJerseyNumOption = goalieJerseyNumber

                    # these fields match the player spider since a goalie is technically a player
                    # When yeild is called it sends the data to the pipeline allowing storage class to access this information
                    yield {
                        "itemType": "player",
                        "firstName":firstName,
                        "lastName":lastName,
                        "playerId":goalieId,
                        # hard coded to match goalie positon
                        "position":"G", 
                        # the goals value is set to none since a goalies skill level calulation 
                        # this is optional in some cases
                        "jerseyNumber":goalieJerseyNumOption, 
                        # doesn't use the goals metric for team fairness and in most cases this is 0
                        "goals":None, 
                        "ptsPg":None,
                        "pts":None,
                        "assists":None,
                        "gamesPlayed":goalieGp,
                        "goalieGaa":goalieGaa
                    }
 
                    # Yield Player Team Info
                    yield {
                        "itemType": "playerTeam",
                        "playerId": goalieId,
                        "seasonId": self.seasonID,
                        "teamId":goalieTeamId,
                        "teamName":goalieTeamName,
                    }

                try: 
                    print(f"{goalieNames["firstName"]} , {goalieNames["lastName"]} , {goalieNames["id"]}")
                except Exception as e: 
                    print(f"ERROR: {e}")
                

            if len(goalieNamesData) == 20:
                nextOffset = offset + 20
                yield scrapy.Request (
                    url=f"https://gamesheetstats.com/api/useGoalies/getGoalieStandings/{self.seasonID}?filter[gametype]=overall&filter[sort]=gaa&filter[limit]=20&filter[offset]={nextOffset}",
                    callback=self.parse,
                    cb_kwargs={"offset":nextOffset}
                )
                
        else:
            print("ERROR REACHING TARGET URL, PLEASE TRY AGAIN")