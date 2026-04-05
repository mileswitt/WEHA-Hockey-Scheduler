// import { useState } from "react";

// export default function UpcomingEvents() {
//   const [division, setDivision] = useState("team_10U");
//   const [schedule, setSchedule] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const generateSchedule = async () => {
//     setLoading(true);
//     try {
//       const response = await fetch(`http://localhost:5000/generate/${division}`);
//       const data = await response.json();
//       setSchedule(data);
//     } catch (error) {
//       console.error("Error fetching schedule:", error);
//     }
//     setLoading(false);
//   };

//   const games = schedule.length > 0
//     ? schedule.map((game, i) => ({
//         date: `Week ${game.week}`,
//         team: `${game.home} vs ${game.away}`,
//         time: `Ice Slot ${game.slot}`,
//         key: i,
//       }))
//     : [
//         { date: "Feb 5",  team: "West Elk vs Gunnison",  time: "7:00 PM", key: 0 },
//         { date: "Feb 8",  team: "West Elk vs Aspen",     time: "6:00 PM", key: 1 },
//         { date: "Feb 12", team: "West Elk vs Telluride",  time: "8:00 PM", key: 2 },
//       ];

//   return (
//     <section style={{ padding: "80px 0", width: "100%" }}>

//       <h2 style={{
//         fontSize: "2.25rem",
//         fontWeight: "bold",
//         textAlign: "center",
//         color: "white",
//         marginBottom: "48px",
//       }}>
//         Upcoming Games
//       </h2>

//       {/* Controls */}
//       <div style={{
//         display: "flex",
//         justifyContent: "center",
//         gap: "16px",
//         marginBottom: "32px",
//       }}>
//       </div>

//       {loading && (
//         <p style={{ textAlign: "center", color: "white", marginBottom: "24px" }}>
//           Generating schedule...
//         </p>
//       )}

//       {/* Gradient card container — centered with explicit side margins */}
//       <div style={{
//         maxWidth: "1000px",
//         margin: "0 auto",
//         padding: "0 24px",
//       }}>
//         <div style={{
//           background: "linear-gradient(to right, #dc2626, #7e22ce, #1d4ed8)",
//           borderRadius: "24px",
//           padding: "40px",
//           boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
//         }}>
//           <div style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(3, 1fr)",
//             gap: "32px",
//           }}>
//             {games.map((game) => (
//               <GameCard key={game.key} date={game.date} team={game.team} time={game.time} />
//             ))}
//           </div>
//         </div>
//       </div>

//     </section>
//   );
// }

// function GameCard({ date, team, time }) {
//   return (
//     <div style={{
//       backgroundColor: "white",
//       borderRadius: "16px",
//       padding: "24px",
//       boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
//       transition: "transform 0.2s",
//       cursor: "default",
//     }}
//       onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
//       onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
//     >
//       <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827" }}>{date}</h3>
//       <p style={{ marginTop: "8px", color: "#1f2937" }}>{team}</p>
//       <p style={{ marginTop: "4px", color: "#4b5563" }}>{time}</p>
//     </div>
//   );
// }
// src/components/UpcomingEvents.jsx
// Shows upcoming games fetched from the database
// Also allows generating a schedule for a selected division

import { useState, useEffect } from "react";

export default function UpcomingEvents() {
  // Stores upcoming games from /api/schedule
  const [games, setGames]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Fetch upcoming games on mount — only show first 6
  useEffect(() => {
    fetch("https://weha-backend.onrender.com/api/schedule")
      .then(res => res.json())
      .then(data => {
        if (data.error)
        {
          setError(data.error);
          setLoading(false);
          return;
        }
        // Only take the first 6 games
        setGames(data.slice(0, 6));
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching games:", err);
        setError("Failed to load games");
        setLoading(false);
      });
  }, []);

  // Format date from "2026-04-01T06:00:00.000Z" to "Apr 1"
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Format time from "18:00:00" to "6:00 PM"
  function formatTime(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const hour   = parseInt(h);
    const ampm   = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  }

  if (loading)
    return (
      <section style={{ padding: "80px 0", width: "100%" }}>
        <p style={{ textAlign: "center", color: "white" }}>Loading upcoming games...</p>
      </section>
    );

  if (error)
    return (
      <section style={{ padding: "80px 0", width: "100%" }}>
        <p style={{ textAlign: "center", color: "#e74c3c" }}>{error}</p>
      </section>
    );

  return (
    <section style={{ padding: "80px 0", width: "100%" }}>

      <h2 style={{
        fontSize:     "2.25rem",
        fontWeight:   "bold",
        textAlign:    "center",
        color:        "white",
        marginBottom: "48px",
      }}>
        Upcoming Games
      </h2>

      {/* Gradient card container */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{
          background:   "linear-gradient(to right, #dc2626, #7e22ce, #1d4ed8)",
          borderRadius: "24px",
          padding:      "40px",
          boxShadow:    "0 25px 50px rgba(0,0,0,0.3)",
        }}>
          <div style={{
            display:             "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap:                 "24px",
          }}>
            {games.map((game, i) => (
              <GameCard
                key={i}
                date={formatDate(game.GameDate)}
                team={`${game.HomeTeamName} vs ${game.AwayTeamName}`}
                time={formatTime(game.GameTime)}
                rink={game.Rink}
              />
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}

// Individual game card
function GameCard({ date, team, time, rink }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius:    "16px",
        padding:         "24px",
        boxShadow:       "0 10px 25px rgba(0,0,0,0.15)",
        transition:      "transform 0.2s",
        cursor:          "default",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      {/* Game date */}
      <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#111827" }}>
        {date}
      </h3>

      {/* Matchup */}
      <p style={{ marginTop: "8px", color: "#1f2937", fontWeight: "600" }}>
        {team}
      </p>

      {/* Game time */}
      <p style={{ marginTop: "4px", color: "#4b5563", fontSize: "14px" }}>
        {time}
      </p>

      {/* Rink location */}
      {rink && (
        <p style={{
          marginTop:  "8px",
          fontSize:   "12px",
          color:      "#6b7280",
          borderTop:  "1px solid #f3f4f6",
          paddingTop: "8px",
        }}>
          📍 {rink}
        </p>
      )}
    </div>
  );
}