// ─── Install: npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction
// ─── Place at: src/components/LeagueCalendar.jsx

import { useState, useEffect } from "react";
import { fetchAllSchedules } from "../api/fetchApiData";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

// Color map for each division — used to color calendar events and filter buttons
const DIVISION_COLORS = {
  "A League":   "#2ecc71",
  "B League":   "#3aa8d8",
  "C League":   "#9b59b6",
  "A/B League": "#e67e22",
  "C/B League": "#e74c3c",
  "10U A":      "#f39c12",
  "10U B":      "#1abc9c",
  "12U A":      "#d35400",
  "12U B":      "#8e44ad",
  "14U A":      "#2980b9",
  "14U B":      "#c0392b",
};

// Helper — returns the color for a division, or gray if not found
function getDivColor(division) {
  return DIVISION_COLORS[division] || "#888";
}

// ─── Game Modal ───────────────────────────────────────────────────
// Shown when user clicks on a calendar event
// Receives the FullCalendar event object and an onClose callback
function GameModal({ event, onClose }) {
  // Get division color for the badge
  const color = getDivColor(event.extendedProps.division);

  return (
    // Dark overlay behind the modal clicking it closes the modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
    >
      {/* Modal card stopPropagation prevents clicks inside from closing it */}
      <div
        className="relative w-full max-w-lg rounded-md p-7 text-white overflow-y-auto"
        style={{
          background: "#0d1b2a",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          maxHeight: "88vh",
          fontFamily: "'Bebas Neue', Impact, sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* X button in top right corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm hover:bg-white/20 transition-colors"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          ✕
        </button>

        {/* Division and league badge pills */}
        <div className="flex gap-2 mb-3">
          <span
            className="text-xs px-2 py-1 rounded text-white tracking-widest"
            style={{ background: color }}
          >
            {event.extendedProps.division}
          </span>
          <span
            className="text-xs px-2 py-1 rounded text-white tracking-widest"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            {event.extendedProps.league}
          </span>
        </div>

        {/* Home team name */}
        <h2 className="text-xl tracking-wide leading-tight mb-1">
          {event.extendedProps.home}
        </h2>

        {/* VS separator */}
        <p className="text-xs text-white/50 mb-1" style={{ fontFamily: "system-ui,sans-serif" }}>
          vs
        </p>

        {/* Away team name */}
        <h2 className="text-xl tracking-wide leading-tight mb-1">
          {event.extendedProps.away}
        </h2>

        {/* Game time and rink location */}
        <p className="text-xs text-white/50 mb-5" style={{ fontFamily: "system-ui,sans-serif" }}>
          {event.extendedProps.time} · {event.extendedProps.rink}
        </p>

        {/* Side by side home vs away team boxes */}
        <div className="flex items-center gap-3">
          {/* Home team box */}
          <div
            className="flex-1 rounded-md p-3 text-center"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <div className="text-sm tracking-wide">{event.extendedProps.home}</div>
            <div className="text-xs text-white/40 mt-1" style={{ fontFamily: "system-ui,sans-serif" }}>
              Home
            </div>
            <div className="flex justify-center items-center gap-3 mt-2">
              <span className="text-xs text-white/40">{event.extendedProps.homeWins} W</span>
              <span className="text-xs text-white/40">{event.extendedProps.homeLosses} L</span>
              <span className="text-xs text-white/40">{event.extendedProps.homeTies} T</span>
            </div>
          </div>

          {/* VS label between the two boxes */}
          <span className="text-base text-white/35 shrink-0">VS</span>

          {/* Away team box */}
          <div
            className="flex-1 rounded-md p-3 text-center"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <div className="text-sm tracking-wide">{event.extendedProps.away}</div>
            <div className="text-xs text-white/40 mt-1" style={{ fontFamily: "system-ui,sans-serif" }}>
              Away
            </div>
            <div className="flex justify-center items-center gap-3 mt-2">
              <span className="text-xs text-white/40">{event.extendedProps.awayWins} W</span>
              <span className="text-xs text-white/40">{event.extendedProps.awayLosses} L</span>
              <span className="text-xs text-white/40">{event.extendedProps.awayTies} T</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function LeagueCalendar() {

  // Stores the list of calendar events built from the DB schedule
  const [events, setEvents] = useState([]);

  // Stores unique league names for the league filter buttons
  const [leagues, setLeagues] = useState(["All Leagues"]);

  // Stores unique division names for the division filter buttons
  const [divisions, setDivisions] = useState(["All Divisions"]);

  // Tracks which league filter button is currently active
  const [activeLeague, setActiveLeague] = useState("All Leagues");

  // Tracks which division filter button is currently active
  const [activeDivision, setActiveDivision] = useState("All Divisions");

  // Stores the event the user clicked on — passed to GameModal
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Shows loading state while fetching from backend
  const [loading, setLoading] = useState(true);

  // Stores any error message if the fetch fails
  const [error, setError] = useState(null);

  // Fetch game schedule from backend when component first loads
useEffect(() => {
  fetchAllSchedules()
    .then(data => {
      const calendarEvents = data.map(game => ({
        id:              game.GameID,
        title:           `${game.HomeTeamName} vs ${game.AwayTeamName}`,
        start:           game.GameDate,
        backgroundColor: getDivColor(game.DivisionName),
        borderColor:     "transparent",
        textColor:       "#fff",
        extendedProps: {
          league:      game.LeagueName,
          division:    game.DivisionName,
          home:        game.HomeTeamName,
          away:        game.AwayTeamName,
          time:        game.GameTime,
          rink:        game.Rink,
          homeWins:    game.HomeWins,
          homeLosses:  game.HomeLosses,
          homeTies:    game.HomeTies,
          awayWins:    game.AwayWins,
          awayLosses:  game.AwayLosses,
          awayTies:    game.AwayTies,
        },
      }));
      setEvents(calendarEvents);
      const uniqueLeagues   = ["All Leagues",   ...new Set(data.map(g => g.LeagueName))];
      const uniqueDivisions = ["All Divisions", ...new Set(data.map(g => g.DivisionName))];
      setLeagues(uniqueLeagues);
      setDivisions(uniqueDivisions);
      setLoading(false);
    })
    .catch(() => { setError("Failed to load schedule"); setLoading(false); });
  }, []);

  // Filter displayed events based on active league and division selections
  const filteredEvents = events.filter(e => {
    const leagueMatch = activeLeague   === "All Leagues"   || e.extendedProps.league   === activeLeague;
    const divMatch    = activeDivision === "All Divisions" || e.extendedProps.division === activeDivision;
    return leagueMatch && divMatch;
  });

  // Show loading screen while fetching
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-700">
        <p className="text-white text-2xl tracking-widest" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
          Loading Schedule...
        </p>
      </div>
    );

  // Show error screen if fetch failed
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-700">
        <p className="text-white text-2xl tracking-widest" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
          Error: {error}
        </p>
      </div>
    );

  return (
    // Full page wrapper — w-full ensures it spans entire screen width
    // without this the calendar stays left-aligned
    <div
      className="min-h-screen w-full px-6 py-8 pb-16 flex flex-col items-center"
      style={{ background: "#CC1010", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.04em" }}
    >
      {/* Inject FullCalendar dark theme CSS overrides into the page */}
      <style>{CALENDAR_CSS}</style>

      {/* Page title */}
      <h1
        className="text-center text-5xl text-white mb-1 tracking-widest"
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
      >
        WCHL LEAGUE SCHEDULE
      </h1>

      {/* Subtitle */}
      <p
        className="text-center text-xs text-white/60 mb-5 tracking-widest"
        style={{ fontFamily: "system-ui,sans-serif" }}
      >
        Western Colorado Hockey League · 2025–26 Season
      </p>

      {/* League filter buttons — built dynamically from DB data */}
      <div className="flex justify-center flex-wrap gap-2 w-full max-w-4xl mx-auto mb-3">
        {leagues.map(l => (
          <button
            key={l}
            onClick={() => setActiveLeague(l)}
            className={`px-4 py-1.5 rounded text-xs text-white tracking-widest border-2 transition-all cursor-pointer
              ${activeLeague === l
                ? "border-white bg-white/20"
                : "border-white/20 bg-white/8 hover:bg-white/15"
              }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Division filter buttons — color coded by division */}
      <div className="flex justify-center flex-wrap gap-2 w-full max-w-4xl mx-auto mb-5">
        {divisions.map(d => {
          const active = activeDivision === d;
          const color  = DIVISION_COLORS[d];
          return (
            <button
              key={d}
              onClick={() => setActiveDivision(d)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs text-white tracking-widest border-2 transition-all cursor-pointer"
              style={{
                // Active button fills with division color as background
                background:  active && color ? color : "rgba(255,255,255,0.08)",
                // Border uses division color whether active or inactive
                borderColor: active ? (color || "#fff") : (color || "rgba(255,255,255,0.2)"),
              }}
            >
              {/* Show colored dot only on inactive division buttons */}
              {d !== "All Divisions" && !active && (
                <span
                  className="w-2 h-2 rounded-full shrink-0 inline-block"
                  style={{ background: color || "#888" }}
                />
              )}
              {d}
            </button>
          );
        })}
      </div>

      {/* Calendar container — w-full + max-w-4xl + mx-auto centers it on the page */}
      <div
        className="rounded-xl p-3 w-full max-w-4xl mx-auto"
        style={{ background: "#0d1b2a", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
      >
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate="2026-04-01"
          events={filteredEvents}                            // only show filtered events
          eventClick={info => setSelectedEvent(info.event)} // open modal on click
          headerToolbar={{ left: "prev", center: "title", right: "next" }}
          height="auto"
          dayMaxEvents={3} // show max 3 events per day, rest hidden under "+more"
        />
      </div>

      {/* Division color legend at the bottom */}
      <div className="flex justify-center flex-wrap gap-5 w-full max-w-4xl mx-auto mt-4">
        {Object.entries(DIVISION_COLORS).map(([div, color]) => (
          <div key={div} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            <span className="text-xs text-white/70 tracking-widest">{div}</span>
          </div>
        ))}
      </div>

      {/* Game modal — only rendered when a calendar event is clicked */}
      {selectedEvent && (
        <GameModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

// ─── FullCalendar dark theme CSS overrides ────────────────────────
// Tailwind cannot reach FullCalendar's internal CSS classes
// so these must be injected as a raw <style> tag
const CALENDAR_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
  .fc { font-family: 'Bebas Neue', Impact, sans-serif; letter-spacing: 0.04em; }
  .fc-toolbar-title { color: #fff !important; font-size: 20px !important; letter-spacing: 0.1em; }
  .fc-button { background: rgba(255,255,255,0.12) !important; border: 1px solid rgba(255,255,255,0.2) !important; color: #fff !important; border-radius: 6px !important; }
  .fc-button:hover { background: rgba(255,255,255,0.22) !important; }
  .fc-col-header-cell-cushion { color: #fff !important; font-size: 14px; letter-spacing: 0.1em; }
  .fc-col-header-cell { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.08) !important; padding: 7px 0 !important; }
  .fc-daygrid-day { background: #0d1b2a !important; border-color: rgba(255,255,255,0.08) !important; border-style: dashed !important; }
  .fc-daygrid-day:hover { background: #122336 !important; }
  .fc-day-other .fc-daygrid-day-number { color: rgba(255,255,255,0.2) !important; }
  .fc-daygrid-day-number { color: rgba(255,255,255,0.7) !important; font-size: 12px; padding: 4px 7px !important; }
  .fc-event { border-radius: 4px !important; padding: 2px 5px !important; font-size: 10px !important; cursor: pointer !important; border: none !important; }
  .fc-event:hover { opacity: 0.85; filter: brightness(1.1); }
  .fc-scrollgrid, .fc-scrollgrid td, .fc-scrollgrid th { border-color: rgba(255,255,255,0.08) !important; }
  .fc-today-button { display: none !important; }
  .fc-daygrid-day.fc-day-today { background: #0f2236 !important; }
  .fc-more-link { color: rgba(255,255,255,0.55) !important; font-size: 10px; }
`;
