from flask import Flask, jsonify, render_template
import pandas as pd
import random
import re

app = Flask(__name__)

# Load CSV
df = pd.read_csv("anonymized.csv")

def clean_years(val):
    if pd.isna(val):
        return 0
    match = re.search(r"\d+", str(val))
    return int(match.group()) if match else 0

df["name"] = df["First"] + " " + df["Last"]
df["experience"] = df["YEARS PLAYED"].apply(clean_years)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/generate-teams")
def generate_teams():
    players = df[["name", "experience"]].to_dict(orient="records")
    random.shuffle(players)

    team1 = []
    team2 = []

    for player in players:
        exp1 = sum(p["experience"] for p in team1)
        exp2 = sum(p["experience"] for p in team2)

        if exp1 <= exp2:
            team1.append(player)
        else:
            team2.append(player)

    avg1 = round(sum(p["experience"] for p in team1) / len(team1), 2)
    avg2 = round(sum(p["experience"] for p in team2) / len(team2), 2)

    return jsonify({
        "team1": team1,
        "team2": team2,
        "team1_avg_experience": avg1,
        "team2_avg_experience": avg2
    })

if __name__ == "__main__":
    app.run(debug=True)