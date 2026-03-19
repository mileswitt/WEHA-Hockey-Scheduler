import requests
import json

# Season ID Meanings
# Season 11383 Title: Regular Season - Western Colorado Hockey League (WCHL) 2025-2026
# Season 6770 Title: Regular Season - Western Colorado Hockey League (WCHL) 2024-2025
# Season 3926 Title: Regular Season - Western Colorado Hockey League (WCHL) 2023-2024

# Main Note:
# Season IDs are how gamesheet gets its information from the api
# The current API allows for the use of a search to find all season IDs of a string
# This code below takes the url for that query and inserts the users input allowing the dynamic retrival of seasonIDs

class SearchSeason():
    # Default Constructor
    def __init__(self):
        self.querySeasonDict = {}
        
    # Function for searching for season ids using user input(stringSearchValue) as a parameter
    def SearchSeasonID(self,stringSearchValue):
        url = f"https://gamesheetinc.com/api/seasons/search?filter[query]={stringSearchValue}"
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
        # If search successful
        if response.status_code == 200:
            # turn response into json objects for parsing
            dataResponse = response.json()
            # prettyPrint = json.dumps(dataResponse, indent=4)
            # print(f"OUTPUT:\n{prettyPrint}")
            
            # get json values from json object called "data" 
            dataSeasonID = dataResponse.get("data")
            # iterate through each season object and find the name of the season(title) as well as the season id gamesheet stores it as
            for season in range(len(dataSeasonID)):
                currentSeasonName = dataSeasonID[season]["title"]
                currentSeasonIdValue = dataSeasonID[season]["id"]
                self.querySeasonDict[currentSeasonName] = currentSeasonIdValue # add each season and title to dict
            return self.querySeasonDict # return dict of all season Ids that were found
        
# Test Cases
# SearchSeason().SearchSeasonID("WCHL") 
# SearchSeason().SearchSeasonID("WEHA")
# SearchSeason().SearchSeasonID("Gunnison")
# SearchSeason().SearchSeasonID("2026")