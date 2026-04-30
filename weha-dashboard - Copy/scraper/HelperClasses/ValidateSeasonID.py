import json
import requests


class Validation():
# The Main Use of this function is to validate the users input belings to a valid season in gamesheets api
    def ValidateSeasonID(self, seasonID):
        # Check API URL to find if seasonID provided is valid in gamesheets system
        url = f"https://gamesheetstats.com/api/useSeasonDivisions/getSeason/{seasonID}"
        # Get request from user Inputted season
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        # If valid(status code 200) then it is a valid URL
        if response.status_code == 200:
            # print("Correct URL")
            data = response.json()
            # print(json.dumps(data, indent=2, ensure_ascii=True))
            seasonTitle = data["title"]
            # If season name is not empty and is not None return a valid season title to use for scraping
            if seasonTitle and seasonTitle.strip() != "":
                return seasonTitle
        else:
            print("Could Not Reach URL, Please Check URL and Try Again")
        return None
    
# Test Cases:
# Validation().ValidateSeasonID(400) # This should not return a string             
# Validation().ValidateSeasonID(11383)  # This should return a string