from flask import Flask, jsonify, request
from flask_cors import CORS
from csv_loader import load_players_from_csv
from team_fairness import balance_teams, format_teams_response
import os

app = Flask(__name__)
CORS(app)


@app.route("/generate-teams", methods=["POST"])
def generate_teams():
    # Validate file is present
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "File name is empty."}), 400

    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported."}), 400

    # Validate num_teams
    try:
        num_teams = int(request.form.get("num_teams", 4))
    except ValueError:
        return jsonify({"error": "num_teams must be a valid integer."}), 400

    # Load CSV
    try:
        players = load_players_from_csv(file.stream)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # Run algorithm
    try:
        teams = balance_teams(players, num_teams)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({
        "teams": format_teams_response(teams),
        "num_teams": num_teams,
        "total_players": sum(t["size"] for t in teams)
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=True)