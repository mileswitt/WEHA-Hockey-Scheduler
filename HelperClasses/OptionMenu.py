from HelperClasses.UserInput import UserInput

class DisplayOptionsMenu():
    def OptionsMenuLogic(self, dictOptionsValue):        
        self.chosenOption = None
        print(f"Search Results\n{dictOptionsValue}")
        for index, value in enumerate(dictOptionsValue, start=1):
            print(f"{index} , {value}")
        self.chosenOption = int(UserInput().UserInputSeasonChoice())
        if self.chosenOption >= 1 and self.chosenOption <= len(dictOptionsValue):
            keys = list(dictOptionsValue.keys())
            ## Take userinput and subtract it by 1 to match dictionary/list iteration behavior
            correctedIndex = int(self.chosenOption) - 1
            ## Take dictionary of season vaules and put it in a list for easy indexing based on user input
            ## This then returns the ID value the user chose
            valueChosen = list(dictOptionsValue)[correctedIndex]
            try:
                # print(f"You chose {keys[correctedIndex]}, ID = {dictOptionsValue.get(valueChosen)}")
                return dictOptionsValue.get(valueChosen) ## return Season id value
            except Exception as e:
                print(f"ERROR: {e}")
        else:
            print(f"Please Choose a Number Between 1 and {len(dictOptionsValue)}")
            return None
        return 
            