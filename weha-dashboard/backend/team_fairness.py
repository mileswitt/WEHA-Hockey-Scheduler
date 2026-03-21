def balance_teams(players, num_teams):
    if not players:
        raise ValueError("No players provided.")
    if num_teams < 2:
        raise ValueError("Must have at least 2 teams.")
    if len(players) < num_teams:
        raise ValueError(f"Not enough players ({len(players)}) for {num_teams} teams.")

    # Sort descending by experience for fair distribution
    sorted_players = sorted(players, key=lambda p: p["experience"], reverse=True)

    # Pre-calculate exact sizes so teams are as even as possible
    n = len(sorted_players)
    base_size = n // num_teams
    extra = n % num_teams  # first `extra` teams get one extra player

    max_sizes = [base_size + (1 if i < extra else 0) for i in range(num_teams)]

    # Initialize teams
    teams = [{"players": [], "total_experience": 0, "max_size": max_sizes[i]} for i in range(num_teams)]

    for player in sorted_players:
        # Only consider teams that still have room
        eligible = [t for t in teams if len(t["players"]) < t["max_size"]]
        # Among eligible, pick the one with lowest total experience
        target = min(eligible, key=lambda t: t["total_experience"])
        target["players"].append(player)
        target["total_experience"] += player["experience"]

    # Compute avg once per team
    result = []
    for team in teams:
        size = len(team["players"])
        avg = round(team["total_experience"] / size, 2) if size > 0 else 0
        result.append({
            "players": team["players"],
            "avg_experience": avg,
            "size": size
        })

    return result


def format_teams_response(teams):
    return {f"team{i + 1}": team for i, team in enumerate(teams)}