// src/components/UpcomingEvents.jsx
// Shows upcoming games fetched from the database
// Also allows generating a schedule for a selected division
// Mobile responsive upcoming games section

import { useState, useEffect } from "react";
import { fetchGames } from "../api/fetchApiData";

export default function UpcomingEvents() {
  const [games,   setGames]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    fetchGames()
      .then(data => {
        setGames(data.slice(0, 6));
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load games");
        setLoading(false);
      });
  }, []);

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", timeZone: "UTC"
    });
  }

  function formatTime(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const hour   = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
  }

  if (loading) return (
    <section style={{ padding: "60px 16px", width: "100%" }}>
      <p style={{ textAlign: "center", color: "white" }}>Loading upcoming games...</p>
    </section>
  );

  if (error) return (
    <section style={{ padding: "60px 16px", width: "100%" }}>
      <p style={{ textAlign: "center", color: "#e74c3c" }}>{error}</p>
    </section>
  );

  return (
    <section style={{ padding: "60px 16px", width: "100%" }}>
      <h2 style={{
        fontSize:     "clamp(1.5rem, 5vw, 2.25rem)",
        fontWeight:   "bold",
        textAlign:    "center",
        color:        "white",
        marginBottom: "32px",
      }}>
        Upcoming Games
      </h2>

      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{
          background:   "linear-gradient(to right, #dc2626, #7e22ce, #1d4ed8)",
          borderRadius: "20px",
          padding:      "clamp(16px, 4vw, 40px)",
          boxShadow:    "0 25px 50px rgba(0,0,0,0.3)",
        }}>
          <div style={{
            display:             "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
            gap:                 "16px",
          }}>
            {games.map((game, i) => (
              <GameCard
                key={i}
                date={formatDate(game.GameDate)}
                team={`${game.HomeTeamName} vs ${game.AwayTeamName}`}
                time={formatTime(game.GameTime)}
                rink={game.RinkLocation}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GameCard({ date, team, time, rink }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius:    "14px",
        padding:         "20px",
        boxShadow:       "0 10px 25px rgba(0,0,0,0.15)",
        transition:      "transform 0.2s",
        cursor:          "default",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "#111827" }}>{date}</h3>
      <p style={{ marginTop: "6px", color: "#1f2937", fontWeight: "600", fontSize: "14px" }}>{team}</p>
      <p style={{ marginTop: "4px", color: "#4b5563", fontSize: "13px" }}>{time}</p>
      {rink && (
        <p style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280",
          borderTop: "1px solid #f3f4f6", paddingTop: "8px" }}>
          📍 {rink}
        </p>
      )}
    </div>
  );
}

