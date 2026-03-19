# -*- coding: utf-8 -*-
"""
Created on Mon Mar  9 13:29:06 2026

@author: djibr
"""

from HelperClasses.UserInput import UserInput
from HelperClasses.ValidateSeasonID import Validation
from HelperClasses.SearchSeason import SearchSeason
from HelperClasses.RunSpiders import RunSpiders
from HelperClasses.OptionMenu import DisplayOptionsMenu

def main():
    
    try:
        seasonNameQueryInput = UserInput().UserInputSeasonQuery()
        searchResults = SearchSeason().SearchSeasonID(seasonNameQueryInput)

        if len(searchResults) != 0:
            print(f"Your Options Are:\n{searchResults}")
            userSeasonOption = DisplayOptionsMenu().OptionsMenuLogic(searchResults)
            print(f"You chose: {userSeasonOption}")
            seasonIDChosen = userSeasonOption
            if seasonIDChosen is not None:
                print("Search Success")                
                querySeasonTitle = Validation().ValidateSeasonID(seasonID=seasonIDChosen)
                if querySeasonTitle is not None:
                    print(f"Now Crawling Season {querySeasonTitle} , ID={seasonIDChosen}")
                    RunSpiders.runSpiderProcesses(seasonIDChosen=seasonIDChosen, querySeasonTitle=querySeasonTitle)
                else:
                    print("This Does Not Match a Season in the APIs, Please Try Again")
            else:
                print("Search Failed")                
        else:
            print("Results Empty")
    except Exception as e:
        print(f"ERROR: {e}")
if __name__ == "__main__":
    main()