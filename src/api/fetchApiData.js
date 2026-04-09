// helper funtions to fetch data from api
//will be used in various components to fetch data from the backend api

const API = "https://weha-backend.onrender.com";

//fetch all teams with wins and losses 
const fetchTeams = async () => {
  try 
  {
    const response = await fetch(`${API}/api/teams`);
    const data = await response.json();
    return data;
  } 
  catch (error) 
  {
    console.error("Error fetching teams:", error);
    throw error;
  }
};

//fetch all divisions 
const fetchDivisions = async () => {
  try 
  {
    const response = await fetch(`${API}/api/divisions`);
    const data = await response.json();
    return data;
  }
    catch (error)
    {
      console.error("Error fetching divisions:", error);
      throw error;
    }
};

// fetch all leagues
const fetchLeagues = async () => {
  try
    {
        const response = await fetch(`${API}/api/leagues`);
        const data = await response.json();
        return data;
    }
    catch (error)
    {
        console.error("Error fetching leagues:", error);
        throw error;
    }
};

// generate schedule for a division
// will return the generated schedule for the division with the provided game date, time, and rink
export async function fetchScheduleForDivision(divisionID, options = {}) {
  const {
    gameDate = new Date().toISOString().split("T")[0],
    gameTime = "18:00:00",
    rink     = "TBD",
  } = options;
 
  const res = await fetch(`${API}/generate/${divisionID}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameDate, gameTime, rink }),
  });
 
  if (!res.ok) throw new Error("Failed to generate schedule");
  return res.json();
}


// Fetches teams + divisions + leagues then builds full schedule
// with wins/losses included on each game
// Use this in WeeklyCalendar, UpcomingEvents, LeagueCalendar
export async function fetchAllSchedules() {
  // Fetch teams, divisions, leagues all at the same time
  const [teams, divisions, leagues] = await Promise.all([
    fetchTeams(),
    fetchDivisions(),
    fetchLeagues(),
  ]);
 
  // Build a lookup map so we can find teams by name quickly
  const teamMap = {};
  teams.forEach(t => { teamMap[t.Name] = t; });
 
  // Build league lookup map
  const leagueMap = {};
  leagues.forEach(l => { leagueMap[l.LeagueID] = l; });
 
  const allGames = [];
 
  // Generate schedule for each division that has enough teams
  for (const division of divisions)
  {
    const divTeams = teams.filter(t => t.DivisionID === division.DivisionID);
    if (divTeams.length < 2) continue;
 
    const league = leagueMap[division.LeagueID];
 
    // POST to generate schedule for this division
    try
    {
      const data = await fetchScheduleForDivision(division.DivisionID);
 
      if (!data.schedule) continue;
 
      // Add team stats and division/league info to each game
      data.schedule.forEach(game => {
        const homeTeam = teamMap[game.home] || {};
        const awayTeam = teamMap[game.away] || {};
 
        allGames.push({
          // FullCalendar compatible fields
          GameID:       `${division.DivisionID}-${game.homeTeamID}-${game.awayTeamID}-${game.week}`,
          HomeTeamName: game.home,
          AwayTeamName: game.away,
          GameDate:     game.gameDate,
          GameTime:     game.gameTime,
          Rink:         game.rink,
          DivisionName: division.Name,
          LeagueName:   league ? league.Name : "Unknown",
 
          // Scheduling algorithm fields
          week:        game.week,
          slot:        game.slot,
          competitive: game.competitive,
          winPctDiff:  game.winPctDiff,
 
          // Team stats for modal display
          HomeWins:    homeTeam.Wins  ?? 0,
          HomeLosses:  homeTeam.Loses ?? 0,
          HomeTies:    homeTeam.Ties  ?? 0,
          AwayWins:    awayTeam.Wins  ?? 0,
          AwayLosses:  awayTeam.Loses ?? 0,
          AwayTies:    awayTeam.Ties  ?? 0,
        });
      });
    }
    catch (err)
    {
      // Skip divisions that fail — don't crash the whole request
      console.warn(`Skipping division ${division.DivisionID}:`, err.message);
    }
  }
 
  return allGames;
}
