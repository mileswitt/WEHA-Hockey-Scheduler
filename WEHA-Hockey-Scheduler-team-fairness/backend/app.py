from flask import Flask, jsonify, render_template, make_response
import pandas as pd
import random
import re
import os

app = Flask(__name__)

# Load CSV
CSV_PATH = os.path.join(os.path.dirname(__file__), "anonymized.csv")
df = pd.read_csv(CSV_PATH)

def clean_years(val):
    if pd.isna(val):
        return 0
    match = re.search(r"\d+", str(val))
    return int(match.group()) if match else 0

df["name"] = (df["First"].fillna("") + " " + df["Last"].fillna("")).str.strip()
# drop rows with no name
df = df[df["name"] != ""]  
df["experience"] = df["YEARS PLAYED"].apply(clean_years)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/generate-teams")
def generate_teams():
    players = df[["name", "experience"]].to_dict(orient="records")
    random.shuffle(players)

    n = len(players)
    base_size = n // 4
    # Distribute remainder
    max_sizes = [base_size + (1 if i < n % 4 else 0) for i in range(4)]

    teams = [[], [], [], []]

    for player in players:
        # only assign to teams that still have room
        eligible = [(i, t) for i, t in enumerate(teams) if len(t) < max_sizes[i]]
        # pick the  team with the lowest total experience
        chosen_i = min(eligible, key=lambda x: sum(p["experience"] for p in x[1]))[0]
        teams[chosen_i].append(player)

    avgs = [
        round(sum(p["experience"] for p in t) / len(t), 2) if t else 0
        for t in teams
    ]

    response = make_response(jsonify({
        "team1": teams[0], "team1_avg_experience": avgs[0],
        "team2": teams[1], "team2_avg_experience": avgs[1],
        "team3": teams[2], "team3_avg_experience": avgs[2],
        "team4": teams[3], "team4_avg_experience": avgs[3],
    }))
    response.headers["Cache-Control"] = "no-store"
    return response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)