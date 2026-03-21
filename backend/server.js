const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// this will be all the teams and divisions separated
// need to make a dictionary
const WEHA_divisions = {
  // teams in 6U division
  team_6U: ["6U CRESTED BUTTE", "6U GUNNISON"],

  // teams in 8U division
  team_8U: ["8U CRESTED BUTTE", "8U GUNNISON"],

  // teams in 10U division
  team_10U: ["10U girls", "10U SQUIRTS A", "10U SQUIRTS B"],

  // teams in 12U division
  team_12U: ["12U PEEWEES A", "12U PEEWEES B"],

  // teams in 14U division
  team_14U: ["14U BANTMANS"],

  // teams in 18U division
  team_18U: ["HS FALL HOCKEY"],

  // teams in 19U division
  team_19U: ["19U GIRLS"],

  // teams in TOWN LEAGUE A/B
  team_TownLeagueAandB: [
    "ALPINE LUMBER",
    "BLISS CHIROPRACTIC",
    "ELDO",
    "KOCHEVARS",
    "LACY CONSTRUCTION",
    "ROCKY MTN TREES",
  ],

  // teams in TOWN LEAGUE C-B
  team_CandBTownLeague: [
    "ALTITUDE PAINTING",
    "CB ELECTRIC",
    "GB&T",
    "REG",
    "SKA",
    "TALK OF THE TOWN",
  ],

  // teams in gunnison winter league - A
  team_GunnisonWinterLeagueA: [
    "3 RIVERS",
    "DIETRICH DIRTWORKS",
    "MARIOS PIZZA",
    "PIKE BUILDERS",
  ],

  // teams in gunnison winter league - B
  team_GunnisonWinterLeagueB: [
    "ALPINE LUMBER",
    "GVH",
    "GVVC",
    "QUALITY INN/ECONOLODGE",
    "REG",
    "SAW",
    "SKA",
    "SLEIGHTHOLM",
  ],

  // teams in gunnison winter league - C
  team_GunnisonWinterLeagueC: [
    "ALL SPORTS",
    "MIKEYS PIZZA",
    "PALISADES",
    "TEAM GO",
  ],
};

// creating a function to schedule divisions
// this will build and solve the optimization model
function schedule_division(teams) {
  // define season structure
  const NUM_WEEKS = 4;
  const ICE_SLOTS = 2;

  // creating list of all possible matchups
  const hockey_games = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      hockey_games.push([teams[i], teams[j]]);
    }
  }

  // randomize matchup order so solver produces different schedules
  for (let i = hockey_games.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hockey_games[i], hockey_games[j]] = [hockey_games[j], hockey_games[i]];
  }

  // greedy scheduler — replaces PuLP optimizer
  // assigns each game to the first available week/slot combination
  // respects the same constraints as the Python version:
  //   - each matchup happens only once
  //   - each team plays at most once per week
  //   - only one game per ice slot per week

  // track which slots are taken: slotTaken[week][slot] = true/false
  const slotTaken = Array.from({ length: NUM_WEEKS }, () =>
    Array(ICE_SLOTS).fill(false)
  );

  // track which teams have already played in a given week: teamWeekUsed[week] = Set of team names
  const teamWeekUsed = Array.from({ length: NUM_WEEKS }, () => new Set());

  // storing schedule results in list
  const schedule = [];

  for (const game of hockey_games) {
    const [home, away] = game;
    let scheduled = false;

    // try each week and slot until we find an open one
    for (let w = 0; w < NUM_WEEKS && !scheduled; w++) {
      for (let s = 0; s < ICE_SLOTS && !scheduled; s++) {
        // only one game per ice slot per week
        if (slotTaken[w][s]) continue;

        // each team should play at most once per week
        if (teamWeekUsed[w].has(home) || teamWeekUsed[w].has(away)) continue;

        // assign this game to this week/slot
        slotTaken[w][s] = true;
        teamWeekUsed[w].add(home);
        teamWeekUsed[w].add(away);

        schedule.push({
          week: w + 1,
          slot: s + 1,
          home,
          away,
        });

        scheduled = true;
      }
    }

    // if a game couldn't be scheduled (not enough slots), skip it
    // this matches PuLP behavior where infeasible games are simply omitted
  }

  return schedule;
}

app.get("/generate/:division", (req, res) => {
  // getting teams from dictionary
  const teams = WEHA_divisions[req.params.division];

  // if the division does not exist
  if (!teams) {
    return res.json({ error: "division not found" });
  }

  // if there are not enough teams to schedule
  if (teams.length < 2) {
    return res.json({ error: "Not enough teams to schedule" });
  }

  // generate schedule
  const schedule = schedule_division(teams);

  // return json back to react
  res.json(schedule);
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// scheduler can automatically run on every division
// for (const [division_name, teams] of Object.entries(WEHA_divisions)) {
//   console.log(division_name, teams.length);
// }

// dont schedule teams that only have one team in each division
// if (teams.length < 2) {
//   console.log("Not enough teams to schedule");
// }
