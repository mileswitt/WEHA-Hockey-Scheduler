// Upcoming events strip — shows the next 6 scheduled games fetched from /api/schedule.
// Displays them in a responsive grid (1 col → 2 cols → 3 cols) inside a gradient
// card container. The schedule data is shared with WeeklyCalendar via fetchGames(),
// which caches results in localStorage for 10 minutes.
import { useState, useEffect } from "react";
import { fetchGames } from "../api/fetchApiData";

export default function UpcomingEvents() {
  const [games, setGames]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

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

  // "2026-04-01T06:00:00.000Z" → "Apr 1"
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // "18:00:00" → "6:00 PM"
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
      <section className="py-16 w-full">
        <p className="text-center text-white">Loading upcoming games...</p>
      </section>
    );

  if (error)
    return (
      <section className="py-16 w-full">
        <p className="text-center" style={{ color: "#e74c3c" }}>{error}</p>
      </section>
    );

  return (
    <section className="py-14 md:py-20 w-full">

      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-white mb-10 md:mb-12">
        Upcoming Games
      </h2>

      {/* Gradient wrapper — centered with responsive horizontal padding */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div
          style={{
            background:   "linear-gradient(to right, #dc2626, #7e22ce, #1d4ed8)",
            borderRadius: "24px",
            padding:      "24px",
            boxShadow:    "0 25px 50px rgba(0,0,0,0.3)",
          }}
        >
          {/* Game cards: 1 col on phone, 2 on tablet, 3 on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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

// Individual white card for a single game matchup.
function GameCard({ date, team, time, rink }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius:    "16px",
        padding:         "20px",
        boxShadow:       "0 10px 25px rgba(0,0,0,0.15)",
        transition:      "transform 0.2s",
        cursor:          "default",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "#111827" }}>
        {date}
      </h3>
      <p style={{ marginTop: "6px", color: "#1f2937", fontWeight: "600", fontSize: "14px" }}>
        {team}
      </p>
      <p style={{ marginTop: "4px", color: "#4b5563", fontSize: "13px" }}>
        {time}
      </p>
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
