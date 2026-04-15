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

  // Shuffle teams with equal win percentage for variety
  for (let i = seeded.length - 1; i > 0; i--) 
  {
    if (seeded[i].winPercentage === seeded[i-1].winPercentage) 
    {
      if (Math.random() > 0.5) 
      {
        [seeded[i], seeded[i-1]] = [seeded[i-1], seeded[i]];
      }
    }
  }

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
        g.GameDate,
        g.GameTime,
        g.RinkLocation,
        g.CurrentGameStatus,
        home.Name      AS HomeTeamName,
        home.Wins      AS HomeWins,
        home.Losses    AS HomeLosses,
        home.Ties      AS HomeTies,
        away.Name      AS AwayTeamName,
        away.Wins      AS AwayWins,
        away.Losses    AS AwayLosses,
        away.Ties      AS AwayTies,
        d.Name         AS DivisionName,
        l.Name         AS LeagueName
      FROM game g
      JOIN team home     ON g.HomeTeamID = home.TeamID
      JOIN team away     ON g.AwayTeamID = away.TeamID
      JOIN division d    ON home.DivisionID = d.DivisionID
      JOIN league l      ON d.LeagueID = l.LeagueID
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

app.post("/generate-all", async (req, res) => {
  try
  {
    const {
      gameDate = new Date().toISOString().split("T")[0],
      gameTime = "18:00:00",
      rink     = "TBD",
    } = req.body;

    const allDivisions = await getDivisions();
    const allTeams     = await getTeams();
    const results      = [];

    for (const division of allDivisions)
    {
      const teams = allTeams.filter(t => t.DivisionID === division.DivisionID);
      if (teams.length < 2) continue;

      try
      {
        const response = await fetch(
          `http://localhost:${process.env.PORT || 5000}/generate/${division.DivisionID}`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ gameDate, gameTime, rink }),
          }
        );
        const data = await response.json();
        results.push({
          divisionID:   division.DivisionID,
          divisionName: division.Name,
          totalGames:   data.totalGames || 0,
        });
        console.log(`✅ Division ${division.DivisionID} — ${data.totalGames} games`);
      }
      catch (err)
      {
        console.warn(`⚠ Skipping division ${division.DivisionID}:`, err.message);
        results.push({ divisionID: division.DivisionID, error: err.message });
      }
    }

    res.json({ message: "All divisions generated", results });
  }
  catch (err)
  {
    res.status(500).json({ error: err.message });
  }
});

app.post("/generate/:divisionID", async (req, res) => {
  try
  {
    const divisionID = parseInt(req.params.divisionID);

    const {
      seasonID = null,
      gameDate = new Date().toISOString().split("T")[0],
      gameTime = "18:00:00",
      rink     = "TBD",
    } = req.body;

    // Pull teams from external API filtered by divisionID
    const allTeams = await getTeams();
    const teams    = allTeams.filter(t => t.DivisionID === divisionID);

    if (!teams || teams.length === 0)
      return res.status(404).json({ error: "No teams found for this division" });

    if (teams.length < 2)
      return res.status(400).json({ error: "Not enough teams to schedule" });

    // Pull division and league info from external API
    const allDivisions = await getDivisions();
    const division     = allDivisions.find(d => d.DivisionID === divisionID);

    const allLeagues = await getLeagues();
    const league     = allLeagues.find(l => l.LeagueID === (division ? division.LeagueID : null));

    // // Pull seasons from external API
    // const allSeasons = await getSeasons();
    // const season     = seasonID ? allSeasons.find(s => s.SeasonID === seasonID) : null;
    const leagueID   = league ? league.LeagueID : null;

    // Pull seasons and find one that matches the league
    const allSeasons = await getSeasons();
    const matchingSeason = allSeasons.find(s => s.LeagueID === leagueID);
    const useSeasonID = seasonID || (matchingSeason ? matchingSeason.SeasonID : null);

    let validSeasonID = null;
    try
    {
      // First try the exact season we found
      const [seasonRows] = await db.query(
        'SELECT SeasonID FROM season WHERE SeasonID = ? LIMIT 1',
        [useSeasonID]
      );

      if (seasonRows.length > 0)
      {
        // Found it — use it
        validSeasonID = seasonRows[0].SeasonID;
      }
      else
      {
        // Not found — try any season for this league in local DB
        const [anySeasonRows] = await db.query(
          'SELECT SeasonID FROM season WHERE LeagueID = ? LIMIT 1',
          [leagueID]
        );

        if (anySeasonRows.length > 0)
        {
          validSeasonID = anySeasonRows[0].SeasonID;
        }
        else
        {
          // Last resort — use any season at all
          const [firstSeason] = await db.query(
            'SELECT SeasonID FROM season LIMIT 1'
          );
          if (firstSeason.length > 0) validSeasonID = firstSeason[0].SeasonID;
        }
      }
    }
    catch (e)
    {
      console.warn("Season lookup failed:", e.message);
    }

    if (!validSeasonID)
      return res.status(400).json({ error: "No valid season found in database" });

    // Run seeded round robin algorithm
    const schedule = schedule_division(teams);

    const insertedGames = [];

    for (const game of schedule)
    {
      if (game.home === "BYE" || game.away === "BYE") continue;

      const homeTeam = teams.find(t => t.Name === game.home);
      const awayTeam = teams.find(t => t.Name === game.away);

      if (!homeTeam || !awayTeam) continue;

      // spreads games across Fri/Sat/Sun within each week
     const weekStart = new Date(
        new Date(gameDate).getTime() + (game.week - 1) * 7 * 24 * 60 * 60 * 1000
      );

      // Assign slot to Fri(5), Sat(6), or Sun(0) based on slot number
      const weekendDays = [5, 6, 0]; // Friday, Saturday, Sunday
      const targetDay   = weekendDays[game.slot % 3];
      const currentDay  = weekStart.getDay();

      // Calculate days to add to reach target weekend day
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd < 0) daysToAdd += 7;

      const gameDay = new Date(weekStart.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      const gameDateForWeek = gameDay.toISOString().split("T")[0];

      // Generate unique GameID from team IDs and week
      const gameID = parseInt(
        `${homeTeam.TeamID}${awayTeam.TeamID}${game.week}`.slice(0, 9)
      );
      // insert home team into scheduledteam table
      await db.query(`
        INSERT IGNORE INTO scheduledteam
          (ScheduledTeamID, Name, LeagueID, DivisionID, SeasonID, EnteredByID, EnteredDate, EnteredTime)
        VALUES (?, ?, ?, ?, ?, 1, CURDATE(), CURTIME())
      `, [awayTeam.TeamID, awayTeam.Name, leagueID, divisionID, validSeasonID]);
      
      // insert away team into scheduledteam table
      await db.query(`
        INSERT IGNORE INTO scheduledteam
          (ScheduledTeamID, Name, LeagueID, DivisionID, SeasonID, EnteredByID, EnteredDate, EnteredTime)
        VALUES (?, ?, ?, ?, ?, 1, CURDATE(), CURTIME())
      `, [homeTeam.TeamID, homeTeam.Name, leagueID, divisionID, validSeasonID]);

      // Insert into game table
      // Uses TeamID directly since game references team table
      await db.query(`
        INSERT IGNORE INTO game
          (GameID, HomeTeamID, AwayTeamID, SeasonID, GameDate, GameTime, RinkLocation, CurrentGameStatus)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled')
      `, [
        gameID,
        homeTeam.TeamID,
        awayTeam.TeamID,
        validSeasonID,  // ← changed from seasonID || 1
        gameDateForWeek,
        gameTime,
        rink
      ]);

      insertedGames.push({
        gameID,
        ...game,
        gameDate:     gameDateForWeek,
        gameTime,
        rink,
        divisionName: division ? division.Name : "Unknown",
        leagueName:   league   ? league.Name   : "Unknown",
      });
    }

    res.json({
      divisionID,
      divisionName: division ? division.Name : "Unknown",
      leagueName:   league   ? league.Name   : "Unknown",
      teamCount:    teams.length,
      totalGames:   insertedGames.length,
      schedule:     insertedGames
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
