@app.route("/generate-teams")
def generate_teams():
    players = df[["name", "experience"]].to_dict(orient="records")
    random.shuffle(players)

    n = len(players)
    base_size = n // 4
    max_sizes = [base_size + (1 if i < n % 4 else 0) for i in range(4)]

    teams = [[], [], [], []]

    for player in players:
        eligible = [(i, t) for i, t in enumerate(teams) if len(t) < max_sizes[i]]
        chosen_i = min(eligible, key=lambda x: sum(p["experience"] for p in x[1]))[0]
        teams[chosen_i].append(player)

    avgs = [
        round(sum(p["experience"] for p in t) / len(t), 2) if t else 0
        for t in teams
    ]

    return jsonify({
        "team1": teams[0],
        "team2": teams[1],
        "team3": teams[2],
        "team4": teams[3],
        "team1_avg_experience": avgs[0],
        "team2_avg_experience": avgs[1],
        "team3_avg_experience": avgs[2],
        "team4_avg_experience": avgs[3]
    })