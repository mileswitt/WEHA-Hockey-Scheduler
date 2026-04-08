const express = require("express");
const cors = require("cors");
const {createServer} = require("http");
const {join} = require("path");
const {Server} = require("socket.io");


const app = express();
const db = require("./db");
const server = createServer(app);
const io = new Server(server);
// app.use(cors());
// app.use(express.json());

//https://dev.to/dipakahirav/part-7-connecting-to-a-database-with-nodejs-4be1


app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://weha-hockey-scheduler-1.onrender.com'
  ]
}));
app.use(express.json());

// Base URL for the external data API
const DATA_API = "https://weha-hockey-scheduler-data-demo.onrender.com/api";

// get all teams from the api
// getting games for the upcomingevents page

async function getTeams()
{
  try
  {
    const response = await fetch(`${DATA_API}/getTeams`);
    if(!response.ok)
    {
      throw new Error("Failed to fetch teams");
    }
    const teams = await response.json();
    return teams;
  }
  catch (err)
  {
    console.error("Error fetching teams:", err);
    throw err;
  }
}

// get all divisions from the api
async function getDivisions()
{
  try
  {
    const response = await fetch(`${DATA_API}/getDivisions`);
    if(!response.ok)
    {
      throw new Error("Failed to fetch divisions");
    }
    const divisions = await response.json();
    return divisions;
  }
  catch (err)
  {
    console.error("Error fetching divisions:", err);
    throw err;
  }
}

// get all seasons from the api
async function getSeasons()
{
  try
  {
    const response = await fetch(`${DATA_API}/getSeasons`);
    if(!response.ok)
    {
      throw new Error("Failed to fetch seasons");
    }
    const seasons = await response.json();
    return seasons;
  }
  catch (err)
  {
    console.error("Error fetching seasons:", err);
    throw err;
  }
}

// get all leagues from the api
async function getLeagues()
{
  try
  {
    const response = await fetch(`${DATA_API}/getLeagues`);
    if(!response.ok)
    {
      throw new Error("Failed to fetch leagues");
    }
    const leagues = await response.json();
    return leagues;
  }
  catch (err)
  {
    console.error("Error fetching leagues:", err);
    throw err;
  }
}


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
    seeded.push({Name: "BYE", Wins: 0, Loses: 0, Ties: 0, GamesPlayed: 0, winPct: 0});
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
          homeTeamID:  topSeed.TeamID,
          awayTeamID:  bottomSeed.TeamID,
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
}

// Get all teams from external API
app.get("/api/teams", async (req, res) => {
  try 
  {
    const teams = await getTeams();
    res.json(teams);
  } 
  catch (err) 
  {
    console.error("Error fetching teams:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});
 
// Get all divisions from external API
app.get("/api/divisions", async (req, res) => {
  try 
  {
    const divisions = await getDivisions();
    res.json(divisions);
  } catch (err) 
  {
    console.error("Error fetching divisions:", err);
    res.status(500).json({ error: "Failed to fetch divisions" });
  }
});
 
// Get all seasons from external API
app.get("/api/seasons", async (req, res) => {
  try 
  {
    const seasons = await getSeasons();
    res.json(seasons);
  } 
  catch (err) 
  {
    console.error("Error fetching seasons:", err);
    res.status(500).json({ error: "Failed to fetch seasons" });
  }
});
 
// Get all leagues from external API
app.get("/api/leagues", async (req, res) => {
  try {
    const leagues = await getLeagues();
    res.json(leagues);
  } catch (err) 
  {
    console.error("Error fetching leagues:", err);
    res.status(500).json({ error: "Failed to fetch leagues" });
  }
});

// Get upcoming games from local DB Game table
app.get("/api/game", async (req, res) => {
  try {
    const [rows] = await db.query(`
     SELECT
        g.GameID,
        home.Name   AS HomeTeamName,
        away.Name   AS AwayTeamName,
        g.GameDate,
        g.GameTime,
        g.CurrentGameStatus,
        g.HomeTeamScore,
        g.AwayTeamScore
      FROM Game g
      JOIN ScheduledTeam home ON g.HomeTeamID = home.ScheduledTeamID
      JOIN ScheduledTeam away ON g.AwayTeamID = away.ScheduledTeamID
      WHERE g.GameDate >= CURDATE()
      ORDER BY g.GameDate ASC, g.GameTime ASC
    `);
 
    if (!rows || rows.length === 0) {
      res.status(404).json({ error: "No upcoming games found" });
    } else {
      res.json(rows);
    }
  } catch (err) {
    console.error("Error fetching schedule:", err);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});
 
// ============================================================
// GENERATE SCHEDULE ROUTE
// Pulls teams from external API filtered by divisionID
// Runs seeded round robin algorithm
// Inserts generated games into local Game table
// ============================================================
// app.post("/generate/:divisionID", async (req, res) => {
//   try {
//     const divisionID = parseInt(req.params.divisionID);
    
//     // Get editable fields from request body
//     // These are set by the admin/user on the frontend

//     const {
//       seasonID  = null,
//       gameDate  = new Date().toISOString().split("T")[0], // defaults to today
//       gameTime  = "18:00:00",   // default 6pm
//       rink      = "TBD",        // default rink
//       adminID   = 1             // default admin
//     } = req.body;
 
//     // Pull all teams from external API then filter by divisionID
//     const allTeams = await getTeams();
//     const teams = allTeams.filter(t => t.DivisionID === divisionID);
 
//     if (!teams || teams.length === 0) {
//       return res.status(404).json({ error: "No teams found for this division" });
//     }
 
//     if (teams.length < 2) {
//       return res.status(400).json({ error: "Not enough teams to schedule" });
//     }

//      // Pull seasons from external API to get the LeagueID
//     const allSeasons = await getSeasons();
//     const season = allSeasons.find(s => s.SeasonID === seasonID);
//     const leagueID = season ? season.LeagueID : teams[0].LeagueID;

//     // Step 1 Insert League into local DB if not exists
//     await db.query(`
//       INSERT IGNORE INTO League (LeagueID, \`Name\`)
//       VALUES (?, ?)
//     `, [leagueID, season ? season.Name : "Unknown League"]);

//     // Step 2 Insert Division into local DB if not exists
//     await db.query(`
//       INSERT IGNORE INTO Division (DivisionID, LeagueID, \`Name\`)
//       VALUES (?, ?, ?)
//     `, [divisionID, leagueID, "Unknown Division"]);

//     // Step 3 Make sure Season exists in local DB
//     if (seasonID) {
//       await db.query(`
//         INSERT IGNORE INTO Season (SeasonID, LeagueID, \`Name\`)
//         VALUES (?, ?, ?)
//       `, [seasonID, leagueID, season ? season.Name : "Unknown Season"]);
//     }

//     // Step 4 Run seeded round robin algorithm
//     const schedule = schedule_division(teams);

//     // Step 5 Insert each team into ScheduledTeam and Game
//     const insertedGames = [];

//     for (const game of schedule) {
//       if (game.home === "BYE" || game.away === "BYE") continue;

//       const homeTeam = teams.find(t => t.Name === game.home);
//       const awayTeam = teams.find(t => t.Name === game.away);

//       if (!homeTeam || !awayTeam) continue;

//       const scheduledDate = `DATE_ADD('${gameDate}', INTERVAL ${game.week - 1} WEEK)`;

//       // // Insert home team into ScheduledTeam if not exists
//       // await db.query(`
//       //   INSERT IGNORE INTO ScheduledTeam 
//       //     (ScheduledTeamID, \`Name\`, LeagueID, DivisionID, SeasonID, EnteredByID, EnteredDate, EnteredTime)
//       //   VALUES (?, ?, ?, ?, ?, ?, CURDATE(), CURTIME())
//       // `, [homeTeam.TeamID, homeTeam.Name, leagueID, divisionID, seasonID || 1, adminID]);

//       // // Insert away team into ScheduledTeam if not exists
//       // await db.query(`
//       //   INSERT IGNORE INTO ScheduledTeam 
//       //     (ScheduledTeamID, \`Name\`, LeagueID, DivisionID, SeasonID, EnteredByID, EnteredDate, EnteredTime)
//       //   VALUES (?, ?, ?, ?, ?, ?, CURDATE(), CURTIME())
//       // `, [awayTeam.TeamID, awayTeam.Name, leagueID, divisionID, seasonID || 1, adminID]);

//       // Generate a unique GameID based on team IDs and week
//       const gameID = parseInt(`${homeTeam.TeamID}${awayTeam.TeamID}${game.week}`
//         .slice(0, 9));

//       // Insert into Game table
//       await db.query(`
//         INSERT IGNORE INTO Game 
//           (GameID, HomeTeamID, AwayTeamID, SeasonID, HomeTeamScore, AwayTeamScore, GameDate, GameTime, CurrentGameStatus)
//         VALUES (?, ?, ?, ?, 0, 0, DATE_ADD(?, INTERVAL ? WEEK), ?, 'Scheduled')
//       `, [gameID, homeTeam.TeamID, awayTeam.TeamID, seasonID || 1, gameDate, game.week - 1, gameTime]);

//       insertedGames.push({
//         gameID,
//         ...game,
//         gameDate,
//         gameTime,
//         rink
//       });
//     }

//     res.json({
//       divisionID,
//       teamCount:  teams.length,
//       totalGames: insertedGames.length,
//       schedule:   insertedGames
//     });

//   } catch (err) {
//     console.error("Error generating schedule:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// GENERATE SCHEDULE ROUTE
// Pulls teams from external API filtered by divisionID
// Runs seeded round robin algorithm
// Returns schedule without inserting into DB yet

// GET /api/all-schedules
// Runs schedule algorithm for every division and returns all games
// Used by WeeklyCalendar, UpcomingEvents, and LeagueCalendar
app.get("/api/all-schedules", async (req, res) => {
  try
  {
    const allTeams     = await getTeams();
    const allDivisions = await getDivisions();
    const allLeagues   = await getLeagues();

    const allGames = [];

    // Run algorithm for every division that has 2+ teams
    for (const division of allDivisions)
    {
      const teams = allTeams.filter(t => t.DivisionID === division.DivisionID);
      if (teams.length < 2) continue;

      const league   = allLeagues.find(l => l.LeagueID === division.LeagueID);
      const schedule = schedule_division(teams);

      // Add division and league info to each game
      for (const game of schedule)
      {
        allGames.push({
          ...game,
          DivisionName: division.Name,
          LeagueName:   league ? league.Name : "Unknown",
          GameDate:     new Date(
            Date.now() + (game.week - 1) * 7 * 24 * 60 * 60 * 1000
          ).toISOString().split("T")[0],
          GameTime: "18:00:00",
          Rink:     "TBD",
          // Use combined ID as unique game identifier
          GameID: `${division.DivisionID}-${game.homeTeamID}-${game.awayTeamID}-${game.week}`,
          HomeTeamName: game.home,
          AwayTeamName: game.away,
        });
      }
    }

    res.json(allGames);
  }
  catch (err)
  {
    console.error("Error fetching all schedules:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/generate/:divisionID", async (req, res) => {
  try
  {
    const divisionID = parseInt(req.params.divisionID);

    // Get optional editable fields from request body
    const {
      gameDate = new Date().toISOString().split("T")[0],
      gameTime = "18:00:00",
      rink     = "TBD",
    } = req.body;

    // Pull all teams from external API then filter by divisionID
    const allTeams = await getTeams();
    const teams    = allTeams.filter(t => t.DivisionID === divisionID);

    if (!teams || teams.length === 0)
    {
      return res.status(404).json({ error: "No teams found for this division" });
    }

    if (teams.length < 2)
    {
      return res.status(400).json({ error: "Not enough teams to schedule" });
    }

    // Pull division info for league name
    const allDivisions = await getDivisions();
    const division     = allDivisions.find(d => d.DivisionID === divisionID);

    // Pull leagues for league name
    const allLeagues = await getLeagues();
    const league     = allLeagues.find(l => l.LeagueID === (division ? division.LeagueID : null));

    // Run seeded round robin algorithm
    const schedule = schedule_division(teams);

    // Add gameDate, gameTime, rink to each game for display
    const scheduleWithDetails = schedule.map(game => ({
      ...game,
      gameDate: new Date(
        new Date(gameDate).getTime() + (game.week - 1) * 7 * 24 * 60 * 60 * 1000
      ).toISOString().split("T")[0],
      gameTime,
      rink,
    }));

    res.json({
      divisionID,
      divisionName: division ? division.Name     : "Unknown",
      leagueName:   league   ? league.Name       : "Unknown",
      teamCount:    teams.length,
      totalGames:   scheduleWithDetails.length,
      schedule:     scheduleWithDetails
    });
  }
  catch (err)
  {
    console.error("Error generating schedule:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
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
