from flask import Flask, jsonify
from flask_cors import CORS
from docplex.mp.model import Model
import random

app = Flask(__name__)
CORS(app)

# this will be all the teams and divisions seperated

#need to make a dictionary
WEHA_divisions = {
    #teams in 6U division
    "team_6U":["6U CRESTED BUTTE", "6U GUNNISON"],

    #teams in 8U division
    "team_8U" : ["8U CRESTED BUTTE", "8U GUNNISON"],

    #teams in 10U division
    "team_10U" : ["10U girls", "10U SQUIRTS A", "10U SQUIRTS B"],

    #teams in 12U division
    "team_12U" : ["12U PEEWEES A", "12U PEEWEES B"],

    #teams in 14U division
    "team_14U" : ["14U BANTMANS"],

    #teams in 18U division
    "team_18U" : ["HS FALL HOCKEY"],

    #teams in 19U division
    "team_19U" : ["19U GIRLS"],

    #teams in TOWN LEAGUE A/B
    "team_TownLeagueAandB" : ["ALPINE LUMBER", "BLISS CHIROPRACTIC", "ELDO", "KOCHEVARS", "LACY CONSTRUCTION", "ROCKY MTN TREES"],

    #teams in TOWN LEAGUE C-B
    "team_CandBTownLeague" : ["ALTITUDE PAINTING", "CB ELECTRIC", "GB&T", "REG", "SKA", "TALK OF THE TOWN"],

    #teams in gunnison winter league - A
    "team_GunnisonWinterLeagueA" : ["3 RIVERS", "DIETRICH DIRTWORKS", "MARIOS PIZZA", "PIKE BUILDERS"],

    #teams in gunnison winter league - B
    "team_GunnisonWinterLeagueB" : ["ALPINE LUMBER", "GVH", "GVVC", "QUALITY INN/ECONOLODGE", "REG", "SAW", "SKA", "SLEIGHTHOLM"],

    #teams in gunnison winter league - C
    "team_GunnisonWinterLeagueC" : ["ALL SPORTS", "MIKEYS PIZZA", "PALISADES", "TEAM GO"]
    }

# creating a function to schedule divisions 
# this will build and solve the optimization model 
def schedule_division(teams):
    
    model = Model()
    
    # define season structure 
    NUM_WEEKS = 4
    ICE_SLOTS = 2
    
    # creating list of all posible matchups
    hockey_games = []
    for i in range(len(teams)):
        for j in range(i + 1, len(teams)):
            hockey_games.append((teams[i], teams[j]))

    # randomize matchup order so solver produces different schedules
    random.shuffle(hockey_games)
            
    x = model.binary_var_dict(
        [(g,w,s)
        for g in hockey_games
        for w in range(NUM_WEEKS)
        for s in range (ICE_SLOTS)],
        name = "game"
        )
    
    #matchup should only happen one time
    for g in hockey_games:
        model.add_constraint(
            model.sum(x[g,w,s]
                      for w in range(NUM_WEEKS)
                      for s in range(ICE_SLOTS)) == 1
            )
    
    # each team should play at least once per week
    for team in teams:
        for w in range(NUM_WEEKS):
            model.add_constraint(
                model.sum(x[g,w,s]
                          for g in hockey_games if team in g
                          for s in range(ICE_SLOTS)) <=1
                )
    # only one game per ice slot per week          
    for w in range(NUM_WEEKS):
        for s in range(ICE_SLOTS):
            model.add_constraint(
                model.sum(x[g,w,s]for g in hockey_games) <=1
                )
            
    model.minimize(0)
    solution = model.solve()
    
    # storing schedule results in list
    schedule = []
    
    if solution:
        for w in range(NUM_WEEKS):
            for s in range(ICE_SLOTS):
                for g in hockey_games:
                    if x[g,w,s].solution_value > 0.5:
                        schedule.append({
                            "week": w + 1,
                            "slot": s + 1,
                            "home": g[0],
                            "away": g[1]
                            
                            })
    return schedule

    
@app.route("/generate/<division>")
def generate_schedule(division):
    
    # getting teams from dictionary
    teams = WEHA_divisions.get(division)
    
    #if the division does not exist 
    if not teams:
        return jsonify({"error": "division not found"})
    
    # if there are not enough teams to schedule
    if len(teams) < 2:
        return jsonify({"error": "Not enough teams to schedule"})
    
    #generate schedule
    schedule = schedule_division(teams)
    
    #return json back to react
    return jsonify(schedule)

if __name__ == "__main__":
    app.run(debug=True)

    # scheduler can automatically run on every division
    #for division_name, teams in WEHA_divisions.items():
        #print(division_name, len(teams))
    
    # dont schedule teams that only have one team in each division
    #if len(teams) < 2:
        #print("Not enough teams to schedule")
    




