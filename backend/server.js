const express = require("express");
const cors = require("cors");
const {createServer} = require("http");
const {join} = require("path");
const {Server} = require("socket.io");


const app = express();
const db = require("./db");
const server = createServer(app);
const io = new Server(server);
app.use(cors());
app.use(express.json());

//https://dev.to/dipakahirav/part-7-connecting-to-a-database-with-nodejs-4be1


// get all users from the database
// getting games for the upcomingevents page
app.get("/api/schedule", async (req, res) => {
  try
  {
    const [rows] = await db.query(`
      SELECT 
        gs.GameID,
        gs.HomeTeamName,
        gs.AwayTeamName,
        gs.GameDate,
        gs.GameTime,
        gs.Rink,
        l.Name AS LeagueName,
        d.Name AS DivisionName,
        ht.Wins    AS HomeWins,
        ht.Losses  AS HomeLosses,
        at.Wins    AS AwayWins,
        at.Losses  AS AwayLosses
      FROM GameSchedule gs
      JOIN League l   ON gs.LeagueID   = l.LeagueID
      JOIN Division d ON gs.DivisionID = d.DivisionID
      JOIN Team ht    ON ht.Name = gs.HomeTeamName AND ht.DivisionID = gs.DivisionID
      JOIN Team at    ON at.Name = gs.AwayTeamName AND at.DivisionID = gs.DivisionID
      WHERE gs.GameDate >= CURDATE()
      ORDER BY gs.GameDate ASC, gs.GameTime ASC
    `);
    if (!rows || rows.length === 0) 
    {
      res.status(404).json({ error: "No upcoming games found" });
    } 
    else 
    {
      res.json(rows);
    } 
  }
  catch (err)
  {
    console.error("Error fetching schedule:", err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
  
});
//same thing retrieving teams for the teams page
app.get("/api/teams", async (req, res) => {
  try
  {
    const [rows] = await db.query(`
      SELECT  
        t.TeamID,
        t.Name AS TeamName,
        t.Wins,
        t.Losses,
        t.Ties,
        t.GamesPlayed,
        d.Name AS DivisionName,
        l.Name AS LeagueName
      FROM Team t
      JOIN Division d ON t.DivisionID = d.DivisionID
      JOIN League l ON d.LeagueID = l.LeagueID
      ORDER BY l.Name, d.Name, t.Wins DESC
    `);
    if (!rows || rows.length === 0) 
    {
      res.status(404).json({ error: "No teams found" });
    } 
    else 
    {
      res.json(rows);
    }
  }
  catch (err)
  {
    console.error("Error fetching teams:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
   
});

// Get all divisions with their league name
app.get("/api/divisions", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.DivisionID,
        d.Name AS DivisionName,
        l.Name AS LeagueName
      FROM Division d
      JOIN League l ON d.LeagueID = l.LeagueID
      ORDER BY l.Name, d.Name
    `);
    if (!rows || rows.length === 0) 
    {
      res.status(404).json({ error: "No teams found" });
    } 
    else 
    {
      res.json(rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// this will be all the teams and divisions separated
// need to make a dictionary
// const WEHA_divisions = {
//   // teams in 6U division
//   team_6U: ["6U CRESTED BUTTE", "6U GUNNISON"],

//   // teams in 8U division
//   team_8U: ["8U CRESTED BUTTE", "8U GUNNISON"],

//   // teams in 10U division
//   team_10U: ["10U girls", "10U SQUIRTS A", "10U SQUIRTS B"],

//   // teams in 12U division
//   team_12U: ["12U PEEWEES A", "12U PEEWEES B"],

//   // teams in 14U division
//   team_14U: ["14U BANTMANS"],

//   // teams in 18U division
//   team_18U: ["HS FALL HOCKEY"],

//   // teams in 19U division
//   team_19U: ["19U GIRLS"],

//   // teams in TOWN LEAGUE A/B
//   team_TownLeagueAandB: [
//     "ALPINE LUMBER",
//     "BLISS CHIROPRACTIC",
//     "ELDO",
//     "KOCHEVARS",
//     "LACY CONSTRUCTION",
//     "ROCKY MTN TREES",
//   ],

//   // teams in TOWN LEAGUE C-B
//   team_CandBTownLeague: [
//     "ALTITUDE PAINTING",
//     "CB ELECTRIC",
//     "GB&T",
//     "REG",
//     "SKA",
//     "TALK OF THE TOWN",
//   ],

//   // teams in gunnison winter league - A
//   team_GunnisonWinterLeagueA: [
//     "3 RIVERS",
//     "DIETRICH DIRTWORKS",
//     "MARIOS PIZZA",
//     "PIKE BUILDERS",
//   ],

//   // teams in gunnison winter league - B
//   team_GunnisonWinterLeagueB: [
//     "ALPINE LUMBER",
//     "GVH",
//     "GVVC",
//     "QUALITY INN/ECONOLODGE",
//     "REG",
//     "SAW",
//     "SKA",
//     "SLEIGHTHOLM",
//   ],

//   // teams in gunnison winter league - C
//   team_GunnisonWinterLeagueC: [
//     "ALL SPORTS",
//     "MIKEYS PIZZA",
//     "PALISADES",
//     "TEAM GO",
//   ],
// };

// creating a function to schedule divisions
// this will build and solve the optimization model
//https://datastructures-js.info/docs/round-robin
function schedule_division(teams) 
{
  
  // storing schedule results in list
  const schedule = [];
  const seeded =[];

  function calcWinPercentage(team) 
  {
    // Implementation for calculating win percentage
    if (team.GamesPlayed === 0)
    {
      return 0;
    }
    return (team.Wins + team.Ties * 0.5) / team.GamesPlayed;
  }

  // need to loop through every team that came from database
  for (const team of teams)
  {
    seeded.push({...team, winPercentage: calcWinPercentage(team)});
  }
  seeded.sort((a, b) => b.winPercentage - a.winPercentage);

  // need to add bye week if there is an odd number of teams
  if (seeded.length % 2 !== 0)
  {
    seeded.push({Name: "BYE", Wins: 0, Losses: 0, Ties: 0, GamesPlayed: 0, winPct: 0});
  }
  
  const n = seeded.length;
  // this will be the total rounds needed for round robin
  const rounds = n - 1;

  //use round robin algorithm to generate schedule
  //this will guarantee that every team plays every other team once
  
  let teamList = seeded.map(team => team.Name);
  for (let r = 0; r < rounds; r++) 
  {
    let slotCount = 1;
    for (let i = 0; i < n / 2; i++) 
    {
      // implementing the swiss system logic to try to create more competitive matchups based on win percentage
      const home = teamList[i];
      const away = teamList[n - 1 - i];
      if (home !== "BYE" && away !== "BYE") 
      {
        const topSeed = seeded[i];
        const bottomSeed = seeded[n - 1 - i];
        const winPctDiff = Math.abs(topSeed.winPercentage - bottomSeed.winPercentage);
        schedule.push({
          week: r + 1,
          slot: slotCount,
          home,
          away,
          // include matchup quality info for frontend to use in styling
          winPctDiff: winPctDiff.toFixed(2), // difference in win percentage between teams
          // flag for whether this is a competitive matchup (arbitrary threshold)
          competitive: winPctDiff < 0.2 ? "high" : winPctDiff < 0.4 ? "medium" : "low" 
        });
        slotCount++;
      }
    }
    const lastTeam = teamList[n-1];
    for (let i = n - 1; i > 1; i--)
    {
      teamList[i] = teamList[i - 1];
    }
    teamList[1] = lastTeam;
  }

  return schedule;

  // // define season structure
  // const NUM_WEEKS = 4;
  // const ICE_SLOTS = 2;

  // // creating list of all possible matchups
  // const hockey_games = [];
  // for (let i = 0; i < teams.length; i++) {
  //   for (let j = i + 1; j < teams.length; j++) {
  //     hockey_games.push([teams[i], teams[j]]);
  //   }
  // }

  // // randomize matchup order so solver produces different schedules
  // for (let i = hockey_games.length - 1; i > 0; i--) {
  //   const j = Math.floor(Math.random() * (i + 1));
  //   [hockey_games[i], hockey_games[j]] = [hockey_games[j], hockey_games[i]];
  // }

  // // greedy scheduler — replaces PuLP optimizer
  // // assigns each game to the first available week/slot combination
  // // respects the same constraints as the Python version:
  // //   - each matchup happens only once
  // //   - each team plays at most once per week
  // //   - only one game per ice slot per week

  // // track which slots are taken: slotTaken[week][slot] = true/false
  // const slotTaken = Array.from({ length: NUM_WEEKS }, () =>
  //   Array(ICE_SLOTS).fill(false)
  // );

  // // track which teams have already played in a given week: teamWeekUsed[week] = Set of team names
  // const teamWeekUsed = Array.from({ length: NUM_WEEKS }, () => new Set());

  // // storing schedule results in list
  // const schedule = [];

  // for (const game of hockey_games) {
  //   const [home, away] = game;
  //   let scheduled = false;

  //   // try each week and slot until we find an open one
  //   for (let w = 0; w < NUM_WEEKS && !scheduled; w++) {
  //     for (let s = 0; s < ICE_SLOTS && !scheduled; s++) {
  //       // only one game per ice slot per week
  //       if (slotTaken[w][s]) continue;

  //       // each team should play at most once per week
  //       if (teamWeekUsed[w].has(home) || teamWeekUsed[w].has(away)) continue;

  //       // assign this game to this week/slot
  //       slotTaken[w][s] = true;
  //       teamWeekUsed[w].add(home);
  //       teamWeekUsed[w].add(away);

  //       schedule.push({
  //         week: w + 1,
  //         slot: s + 1,
  //         home,
  //         away,
  //       });

  //       scheduled = true;
  //     }
  //   }

  //   // if a game couldn't be scheduled (not enough slots), skip it
  //   // this matches PuLP behavior where infeasible games are simply omitted
  // }

  // return schedule;
}

app.get("/generate/:divisionID", async (req, res) => {
  try
  {
    const divisionID = req.params.divisionID;
 
    // Pull full team stats from DB for seeding
    const [teams] = await db.query(`
      SELECT 
        t.TeamID,
        t.Name,
        t.Wins,
        t.Losses,
        t.Ties,
        t.GamesPlayed
      FROM Team t
      WHERE t.DivisionID = ?
    `, [divisionID]);
 
    if (!teams || teams.length === 0)
    {
      return res.status(404).json({ error: "No teams found for this division" });
    }
 
    if (teams.length < 2)
    {
      return res.status(400).json({ error: "Not enough teams to schedule" });
    }
 
    // Run seeded round robin algorithm
    const schedule = schedule_division(teams);
 
    res.json({
      divisionID,
      teamCount: teams.length,
      totalGames: schedule.length,
      schedule
    });
  }
  catch (err)
  {
    console.error("Error generating schedule:", err);
    res.status(500).json({ error: "Failed to generate schedule" });
  }
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
// 
