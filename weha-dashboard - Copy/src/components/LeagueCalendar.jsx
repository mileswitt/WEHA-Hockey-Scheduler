import { useState, useEffect, useMemo } from "react";
import { fetchGames } from "../api/fetchApiData";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

const DIVISION_COLORS = {
  "A League":   "#16a34a",
  "B League":   "#1d7aab",
  "C League":   "#7c3aed",
  "A/B League": "#c2610c",
  "C/B League": "#c0392b",
  "10U A":      "#b45309",
  "10U B":      "#0d9488",
  "12U A":      "#b94000",
  "12U B":      "#6d28d9",
  "14U A":      "#1e6fa5",
  "14U B":      "#991b1b",
};

// Visual overrides for non-Scheduled statuses on calendar tiles
const STATUS_EVENT_STYLES = {
  Completed: { backgroundColor: "#374151", borderLeft: "3px solid #16a34a" },
  Postponed: { backgroundColor: "#78350f", borderLeft: "3px solid #f59e0b" },
  Cancelled: { backgroundColor: "#450a0a", borderLeft: "3px solid #ef4444" },
};

function getDivColor(division) {
  return DIVISION_COLORS[division] || "#888";
}

function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function StatusPill({ status }) {
  const cfg = {
    Completed: { bg: "#16a34a", label: "Final" },
    Postponed: { bg: "#b45309", label: "Postponed" },
    Cancelled: { bg: "#991b1b", label: "Cancelled" },
    Scheduled: { bg: "#1d4ed8", label: "Scheduled" },
    Draft:     { bg: "#6b7280", label: "Draft" },
  };
  const s = cfg[status] || cfg.Scheduled;
  return (
    <span
      className="text-xs px-2 py-1 rounded text-white font-semibold"
      style={{ background: s.bg, fontFamily: "system-ui, sans-serif", letterSpacing: "normal" }}
    >
      {s.label}
    </span>
  );
}

function GameModal({ event, onClose }) {
  const color      = getDivColor(event.extendedProps.division);
  const status     = event.extendedProps.status;
  const isCompleted = status === "Completed";
  const isPostponed = status === "Postponed";
  const isCancelled = status === "Cancelled";
  const homeScore   = event.extendedProps.homeScore;
  const awayScore   = event.extendedProps.awayScore;
  const hasScore    = isCompleted && homeScore != null && awayScore != null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-md p-7 text-white overflow-y-auto"
        style={{
          background: "#0d1b2a",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          maxHeight: "88vh",
          border: "5px solid rgba(255,255,255,0.7)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: "normal",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm hover:bg-white/20 transition-colors"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          ✕
        </button>

        {/* Division, league, and status badges */}
        <div className="text-center mb-3 flex gap-2 justify-center flex-wrap">
          <span
            className="text-xs px-2 py-1 text-white font-semibold rounded"
            style={{ background: color, fontFamily: "system-ui, sans-serif" }}
          >
            {event.extendedProps.division}
          </span>
          <span
            className="text-xs px-2 py-1 rounded text-white font-medium"
            style={{ background: "rgba(255,255,255,0.15)", fontFamily: "system-ui, sans-serif" }}
          >
            {event.extendedProps.league}
          </span>
          <StatusPill status={status} />
        </div>

        {/* Cancelled / Postponed banner */}
        {(isCancelled || isPostponed) && (
          <div
            className="text-center text-sm font-semibold mb-4 px-3 py-2 rounded"
            style={{
              background: isCancelled ? "rgba(153,27,27,0.45)" : "rgba(180,83,9,0.45)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {isCancelled ? "This game has been cancelled." : "This game has been postponed."}
          </div>
        )}

        {/* Completed game — show big scoreboard */}
        {hasScore ? (
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex-1 text-right">
                <p style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.4rem", letterSpacing: "0.04em" }}>
                  {event.extendedProps.home}
                </p>
                <p className="text-white/40 text-xs mt-0.5">Home</p>
              </div>
              <div
                className="shrink-0 px-4 py-2 rounded-lg text-center"
                style={{ background: "rgba(255,255,255,0.1)", minWidth: "90px" }}
              >
                <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "2.2rem", letterSpacing: "0.1em" }}>
                  {homeScore}
                </span>
                <span className="text-white/40 mx-1" style={{ fontSize: "1.5rem" }}>–</span>
                <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "2.2rem", letterSpacing: "0.1em" }}>
                  {awayScore}
                </span>
              </div>
              <div className="flex-1 text-left">
                <p style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.4rem", letterSpacing: "0.04em" }}>
                  {event.extendedProps.away}
                </p>
                <p className="text-white/40 text-xs mt-0.5">Away</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p
              className="text-center leading-tight mb-1"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.75rem", letterSpacing: "0.04em" }}
            >
              {event.extendedProps.home}
            </p>
            <p className="text-center text-white/50 text-sm mb-1">vs</p>
            <p
              className="text-center leading-tight mb-1"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.75rem", letterSpacing: "0.04em" }}
            >
              {event.extendedProps.away}
            </p>
          </>
        )}

        {/* Time and rink */}
        <div className="text-center mb-5 space-y-1.5">
          {event.extendedProps.time && (
            <p className="text-white/60 text-sm">
              🕐 {formatTime(event.extendedProps.time)}
            </p>
          )}
          {event.extendedProps.rink ? (
            <p className="text-green-300 text-sm font-semibold">
              📍 {event.extendedProps.rink}
            </p>
          ) : (
            <p className="text-white/30 text-xs italic">Location TBA</p>
          )}
        </div>

        {/* W/L/T records — only shown for upcoming games */}
        {!isCompleted && !isCancelled && !isPostponed && (
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-md p-3 text-center" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="text-sm font-semibold">{event.extendedProps.home}</div>
              <div className="text-xs text-white/40 mt-1">Home</div>
              <div className="flex justify-center items-center gap-3 mt-2">
                <span className="text-xs text-white/40">{event.extendedProps.homeWins} W</span>
                <span className="text-xs text-white/40">{event.extendedProps.homeLosses} L</span>
                <span className="text-xs text-white/40">{event.extendedProps.homeTies} T</span>
              </div>
            </div>
            <span className="text-base text-white/35 shrink-0">VS</span>
            <div className="flex-1 rounded-md p-3 text-center" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="text-sm font-semibold">{event.extendedProps.away}</div>
              <div className="text-xs text-white/40 mt-1">Away</div>
              <div className="flex justify-center items-center gap-3 mt-2">
                <span className="text-xs text-white/40">{event.extendedProps.awayWins} W</span>
                <span className="text-xs text-white/40">{event.extendedProps.awayLosses} L</span>
                <span className="text-xs text-white/40">{event.extendedProps.awayTies} T</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeagueCalendar() {
  const [events, setEvents]               = useState([]);
  const [allGames, setAllGames]           = useState([]);
  const [leagues, setLeagues]             = useState(["All Leagues"]);
  const [activeLeague, setActiveLeague]   = useState("All Leagues");
  const [activeDivision, setActiveDivision] = useState("All Divisions");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  const visibleDivisions = useMemo(() => {
    const source = activeLeague === "All Leagues"
      ? allGames
      : allGames.filter(g => g.LeagueName === activeLeague);
    return ["All Divisions", ...new Set(source.map(g => g.DivisionName))];
  }, [activeLeague, allGames]);

  useEffect(() => {
    if (!visibleDivisions.includes(activeDivision)) setActiveDivision("All Divisions");
  }, [visibleDivisions]);

  useEffect(() => {
    fetchGames()
      .then(data => {
        const calendarEvents = data.map(game => {
          const status = game.CurrentGameStatus;
          const override = STATUS_EVENT_STYLES[status];
          return {
            id:              String(game.GameID),
            title:           `${game.HomeTeamName} vs ${game.AwayTeamName}`,
            start:           game.GameDate.split("T")[0],
            backgroundColor: override ? override.backgroundColor : getDivColor(game.DivisionName),
            borderColor:     "transparent",
            textColor:       "#fff",
            classNames:      override ? [`fc-event-${status.toLowerCase()}`] : [],
            extendedProps: {
              league:      game.LeagueName,
              division:    game.DivisionName,
              home:        game.HomeTeamName,
              away:        game.AwayTeamName,
              time:        game.GameTime,
              rink:        game.Rink,
              status:      status,
              homeScore:   game.HomeTeamScore,
              awayScore:   game.AwayTeamScore,
              homeWins:    game.HomeWins    ?? 0,
              homeLosses:  game.HomeLosses  ?? 0,
              homeTies:    game.HomeTies    ?? 0,
              awayWins:    game.AwayWins    ?? 0,
              awayLosses:  game.AwayLosses  ?? 0,
              awayTies:    game.AwayTies    ?? 0,
            },
          };
        });

        setEvents(calendarEvents);
        setAllGames(data);
        setLeagues(["All Leagues", ...new Set(data.map(g => g.LeagueName))]);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load schedule");
        setLoading(false);
      });
  }, []);

  const filteredEvents = events.filter(e => {
    const leagueMatch = activeLeague   === "All Leagues"   || e.extendedProps.league   === activeLeague;
    const divMatch    = activeDivision === "All Divisions" || e.extendedProps.division === activeDivision;
    return leagueMatch && divMatch;
  });

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-700">
        <p className="text-white text-2xl tracking-widest" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
          Loading Schedule...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-700">
        <p className="text-white text-2xl tracking-widest" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
          Error: {error}
        </p>
      </div>
    );

  return (
    <div
      className="min-h-screen w-full px-6 py-8 pb-16 flex flex-col items-center"
      style={{ background: "#CC1010", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.04em" }}
    >
      <style>{CALENDAR_CSS}</style>

      <h1
        className="text-center text-5xl text-white mb-1 tracking-widest"
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
      >
        WCHL LEAGUE SCHEDULE
      </h1>

      <p
        className="text-center text-xs text-white/60 mb-5 tracking-widest"
        style={{ fontFamily: "system-ui,sans-serif" }}
      >
        Western Colorado Hockey League · 2025–26 Season
      </p>

      {/* League filter buttons */}
      <div className="flex justify-center flex-wrap gap-2 w-full max-w-4xl mx-auto mb-3">
        {leagues.map(l => (
          <button
            key={l}
            onClick={() => setActiveLeague(l)}
            className={`px-4 py-1.5 rounded text-xs text-white tracking-widest border-2 transition-all cursor-pointer
              ${activeLeague === l ? "border-white bg-white/20" : "border-white/20 bg-white/8 hover:bg-white/15"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Division filter buttons */}
      <div className="flex justify-center flex-wrap gap-2 w-full max-w-4xl mx-auto mb-5">
        {visibleDivisions.map(d => {
          const active = activeDivision === d;
          const color  = DIVISION_COLORS[d];
          return (
            <button
              key={d}
              onClick={() => setActiveDivision(d)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs text-white tracking-widest border-2 transition-all cursor-pointer"
              style={{
                background:  active && color ? color : "rgba(255,255,255,0.08)",
                borderColor: active ? (color || "#fff") : (color || "rgba(255,255,255,0.2)"),
              }}
            >
              {d !== "All Divisions" && !active && (
                <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ background: color || "#888" }} />
              )}
              {d}
            </button>
          );
        })}
      </div>

      {/* Calendar status legend */}
      <div className="flex justify-center flex-wrap gap-4 w-full max-w-4xl mx-auto mb-4"
           style={{ fontFamily: "system-ui, sans-serif", letterSpacing: "normal" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#374151", border: "2px solid #16a34a" }} />
          <span className="text-xs text-white/60">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#78350f", border: "2px solid #f59e0b" }} />
          <span className="text-xs text-white/60">Postponed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#450a0a", border: "2px solid #ef4444" }} />
          <span className="text-xs text-white/60">Cancelled</span>
        </div>
      </div>

      {/* Calendar */}
      <div
        className="rounded-xl p-3 w-full max-w-4xl mx-auto"
        style={{ background: "#0d1b2a", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
      >
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={filteredEvents}
          eventDidMount={info => {
            const override = STATUS_EVENT_STYLES[info.event.extendedProps.status];
            if (override?.borderLeft) info.el.style.borderLeft = override.borderLeft;
          }}
          eventClick={info => setSelectedEvent(info.event)}
          headerToolbar={{ left: "prev", center: "title", right: "next" }}
          height="auto"
          dayMaxEvents={3}
          initialDate={new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* Division color legend */}
      <div className="flex justify-center flex-wrap gap-5 w-full max-w-4xl mx-auto mt-4">
        {Object.entries(DIVISION_COLORS).map(([div, color]) => (
          <div key={div} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            <span className="text-xs text-white/70 tracking-widest">{div}</span>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <GameModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

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
  .fc-daygrid-day-number { color: rgba(255,255,255,0.75) !important; font-size: 12px; padding: 4px 7px !important; }
  .fc-event { border-radius: 4px !important; padding: 2px 5px !important; font-size: 10px !important; cursor: pointer !important; border: none !important; }
  .fc-event-title { color: #fff !important; font-weight: 600 !important; }
  .fc-event:hover { opacity: 0.85; filter: brightness(1.1); }
  .fc-scrollgrid, .fc-scrollgrid td, .fc-scrollgrid th { border-color: rgba(255,255,255,0.08) !important; }
  .fc-today-button { display: none !important; }
  .fc-daygrid-day.fc-day-today { background: #0f2236 !important; }
  .fc-more-link { color: #93c5fd !important; font-size: 10px !important; font-weight: 600 !important; text-decoration: underline !important; }
  .fc-more-link:hover { color: #bfdbfe !important; }
  .fc-popover { background: #1a2d42 !important; border: 1px solid rgba(255,255,255,0.18) !important; border-radius: 8px !important; overflow: hidden !important; box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important; }
  .fc-popover-header { background: #0d1b2a !important; padding: 8px 12px !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
  .fc-popover-title { color: #fff !important; font-size: 11px !important; letter-spacing: 0.08em !important; }
  .fc-popover-close { color: rgba(255,255,255,0.7) !important; font-size: 14px !important; }
  .fc-popover-close:hover { color: #fff !important; }
  .fc-popover-body { padding: 6px 8px !important; }
  .fc-popover .fc-event { margin-bottom: 3px !important; }
`;
