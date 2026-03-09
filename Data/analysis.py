import pandas as pd
import numpy as np
import os

DFPlayers = pd.read_csv(os.path.join(os.path.dirname(__file__), "anonymized.csv"))

columns = DFPlayers.columns

uniqueDivisions = np.sort(pd.unique(DFPlayers["Division"]))
uniqueLeagues = np.sort(pd.unique(DFPlayers["League"]))

print(f"Divisions Options: {uniqueDivisions}\n")
print(f"League Options: {uniqueLeagues}\n")


# Test Case 1: Not in Dataframe
# Candy League


# Test Case 2: In Division or League Dataframe Columns
# Telluride Winter League
# Durango Ice League

def OutputResults(resultColName,dfOutput):
    print(f"Results for {resultColName}:\n{dfOutput}")

def OptionMenu():
            userInput = input("Please Enter a Filter: ")
            if userInput in columns:
                ####### EXAMPLE Switch statement options
                match userInput:
                    case "League":
                        userInput = input("Now Please Enter Which League: ")
                        queryResult = FilterPlayers(userInput)
                        OutputResults("League", queryResult)
                    case "Division":
                        userInput = input("Now Please Enter Which Division: ")
                        queryResult = FilterPlayers(userInput)
                        OutputResults("Division", queryResult)
            elif userInput == "exit" or userInput == "quit":
                print("EXITING")
                sys.exit(0)
            else:
                print("No Columns Match This Input Please Check Avaiable Filtering Options")
                
             

def FilterPlayers(stringFilterOpt):
    returnDF = pd.DataFrame()
    if stringFilterOpt in uniqueLeagues:
        filterLeague = DFPlayers[DFPlayers['League'] == stringFilterOpt]
        returnDF = filterLeague
        print("QUERY SUCCESSFUL")
        return returnDF
    elif stringFilterOpt in uniqueDivisions:
        filterDivision = DFPlayers[DFPlayers['Division'] == stringFilterOpt]
        returnDF = filterDivision
        print("QUERY SUCCESSFUL")
        return returnDF 
    else:
        print("This Query Returned No Results")
        return returnDF
    


def main():
    resultDF = pd.DataFrame()
    OptionMenu()

    
    

if __name__ == "__main__":
    main()