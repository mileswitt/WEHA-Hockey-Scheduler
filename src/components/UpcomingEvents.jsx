import { useState } from "react";

export default function UpcomingEvents() {
  const [division, setDivision] = useState("team_10U");
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateSchedule = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/generate/${division}`);
      const data = await response.json();
      setSchedule(data);
    } catch (error) {
      console.error("Error fetching schedule:", error);
    }
    setLoading(false);
  };

  const games = schedule.length > 0
    ? schedule.map((game, i) => ({
        date: `Week ${game.week}`,
        team: `${game.home} vs ${game.away}`,
        time: `Ice Slot ${game.slot}`,
        key: i,
      }))
    : [
        { date: "Feb 5",  team: "West Elk vs Gunnison",  time: "7:00 PM", key: 0 },
        { date: "Feb 8",  team: "West Elk vs Aspen",     time: "6:00 PM", key: 1 },
        { date: "Feb 12", team: "West Elk vs Telluride",  time: "8:00 PM", key: 2 },
      ];

  return (
    <section style={{ padding: "80px 0", width: "100%" }}>

      <h2 style={{
        fontSize: "2.25rem",
        fontWeight: "bold",
        textAlign: "center",
        color: "white",
        marginBottom: "48px",
      }}>
        Upcoming Games
      </h2>

      {/* Controls */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "16px",
        marginBottom: "32px",
      }}>
        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            backgroundColor: "white",
            color: "black",
            border: "1px solid #d1d5db",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          <option value="team_6U">6U</option>
          <option value="team_8U">8U</option>
          <option value="team_10U">10U</option>
          <option value="team_12U">12U</option>
          <option value="team_14U">14U</option>
          <option value="team_18U">18U</option>
          <option value="team_19U">19U</option>
          <option value="team_TownLeagueAandB">Town League A/B</option>
          <option value="team_CandBTownLeague">Town League C/B</option>
          <option value="team_GunnisonWinterLeagueA">Gunnison Winter League A</option>
          <option value="team_GunnisonWinterLeagueB">Gunnison Winter League B</option>
          <option value="team_GunnisonWinterLeagueC">Gunnison Winter League C</option>
        </select>

        <button
          onClick={generateSchedule}
          style={{
            backgroundColor: "#dc2626",
            color: "white",
            padding: "8px 24px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Generate Schedule
        </button>
      </div>

      {loading && (
        <p style={{ textAlign: "center", color: "white", marginBottom: "24px" }}>
          Generating schedule...
        </p>
      )}

      {/* Gradient card container — centered with explicit side margins */}
      <div style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "0 24px",
      }}>
        <div style={{
          background: "linear-gradient(to right, #dc2626, #7e22ce, #1d4ed8)",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "32px",
          }}>
            {games.map((game) => (
              <GameCard key={game.key} date={game.date} team={game.team} time={game.time} />
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}

function GameCard({ date, team, time }) {
  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "16px",
      padding: "24px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
      transition: "transform 0.2s",
      cursor: "default",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827" }}>{date}</h3>
      <p style={{ marginTop: "8px", color: "#1f2937" }}>{team}</p>
      <p style={{ marginTop: "4px", color: "#4b5563" }}>{time}</p>
    </div>
  );
}