class UserInput():
    # Ask for user input until valid season keyword is inputted
    def UserInputSeasonQuery(self):
        self.userInput = None
        while True:
            self.userInput = input("Please Enter Your Search Here: ")
            if self.userInput.strip() == "":
                print("Search Name Cannot Be Empty, Please Try Again.")
                continue
            elif self.userInput.strip().isdigit():
                print("Search Name Must Be Letters, Please Try Again.")
                continue
            elif len(self.userInput) <= 2:
                print("Please Type in More Than 2 Charecters")
            elif len(self.userInput) >= 70:
                print("Exceeded Max Charecter Count")
            else:
                return self.userInput
    # Ask for user input to find specific season the user wants to get the information of
    # Instead of being a string this is a number and is correlated with the options menu allowing the user to type digit numbers instead of full season names
    def UserInputSeasonChoice(self):
        self.userInputChoice = None
        while True: 
            self.userInputChoice = input("Please Enter Chosen Season Number Here: ")
            if self.userInputChoice.strip() == "":
                print("Chosen Season Number Cannot Be Empty, Please Try Again.")
                continue
            if not self.userInputChoice.strip().isdigit():
                print("Choice of Season Must be a Digit")
                continue
            else:
                return self.userInputChoice

