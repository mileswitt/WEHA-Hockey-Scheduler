// import FullCalendar from "@fullcalendar/react";
// import timeGridPlugin from "@fullcalendar/timegrid";
// import interactionPlugin from "@fullcalendar/interaction";

// const WeeklyCalendar = () => {
//   return (
//     <div style={{
//       backgroundColor: "#0f2b46",
//       width: "100%",
//       padding: "48px 24px",
//       boxSizing: "border-box",
//     }}>
//       <style>{`
//         .fc-wrapper .fc { width: 100% !important; }
//         .fc-wrapper .fc-view-harness { width: 100% !important; }
//         .fc-wrapper table { width: 100% !important; }
//         .weekly-cal-title {
//           font-size: 1.5rem;
//           font-weight: bold;
//           text-align: center;
//           color: white;
//           margin-bottom: 24px;
//         }
//       `}</style>

//       <h2 className="weekly-cal-title">Weekly Schedule</h2>

//       <div style={{
//         backgroundColor: "#1f2937",
//         borderRadius: "12px",
//         padding: "24px",
//         width: "100%",
//         maxWidth: "1100px",
//         margin: "0 auto",
//         boxSizing: "border-box",
//         overflow: "hidden",
//       }}
//         className="fc-wrapper"
//       >
//         <FullCalendar
//           plugins={[timeGridPlugin, interactionPlugin]}
//           initialView="timeGridWeek"
//           height="auto"
//           expandRows={true}
//           headerToolbar={{
//             left: "prev,next today",
//             center: "title",
//             right: ""
//           }}
//           events={[
//             {
//               title: "Varsity Practice",
//               start: "2026-03-02T16:00:00",
//               end:   "2026-03-02T18:00:00",
//               color: "#c21537",
//             },
//             {
//               title: "JV Practice",
//               start: "2026-03-03T15:00:00",
//               end:   "2026-03-03T17:00:00",
//               color: "#1d4ed8",
//             },
//             {
//               title: "Home Game",
//               start: "2026-03-05T19:00:00",
//               end:   "2026-03-05T21:00:00",
//               color: "#16a34a",
//             }
//           ]}
//         />
//       </div>
//     </div>
//   )
// }

// export default WeeklyCalendar
// src/components/WeeklyCalendar.jsx
// Shows this week's games pulled from the database

import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { fetchGames } from "../api/fetchApiData";

// Weekly schedule calendar — shows all games for the current week pulled from /api/schedule.
// Uses FullCalendar's timeGridWeek view. Two optimizations are applied to make the
// calendar easier to read when only a few days have games:
//   hiddenDays  — columns for days with no events are hidden so the active days
//                 get more horizontal space.
//   slotWindow  — the visible time range is tightened to just cover the earliest
//                 and latest game times (±1–2 hours) instead of showing the full 24 hours.

// Division colors — matches LeagueCalendar; dark enough for white text contrast
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

// Returns division color or default red if not found
function getDivColor(division) {
  return DIVISION_COLORS[division] || "#c21537";
}

// Returns the indexes of days with no events. FullCalendar's hiddenDays prop
// removes those columns entirely, giving each active day a wider column.
// We skip the optimization when nearly all days are active (6+) because it
// would only hide one column and isn't worth the visual disruption.
function computeHiddenDays(evts) {
  if (!evts.length) return [];
  const activeDays = new Set(evts.map(e => new Date(e.start).getDay()));
  if (activeDays.size >= 6) return []; // nearly full week — not worth collapsing
  return [0, 1, 2, 3, 4, 5, 6].filter(d => !activeDays.has(d));
}

// Computes slotMinTime / slotMaxTime so the calendar only renders the hour range
// that actually contains games (plus a 1–2 hour buffer), rather than the full
// 24-hour day. Also returns a scrollTime so the view auto-scrolls to the first
// game rather than starting at midnight.
function computeSlotWindow(evts) {
  if (!evts.length) return { slotMinTime: "17:00:00", slotMaxTime: "22:00:00", scrollTime: "17:00:00" };
  const hours = evts.map(e => {
    const timePart = (e.start || "").split("T")[1] || "12:00:00";
    return parseInt(timePart.split(":")[0], 10);
  });
  const minHour = Math.max(0,  Math.min(...hours) - 1);
  const maxHour = Math.min(24, Math.max(...hours) + 2);
  const pad = n => String(n).padStart(2, "0");
  return {
    slotMinTime: `${pad(minHour)}:00:00`,
    slotMaxTime: `${pad(maxHour)}:00:00`,
    scrollTime:  `${pad(Math.max(0, Math.min(...hours)))  }:00:00`,
  };
}

function WeeklyCalendarInner({ events, calRef, setTooltip }) {
  const { slotMinTime, slotMaxTime, scrollTime } = computeSlotWindow(events);
  const hiddenDays = computeHiddenDays(events);

  return (
    <div
      className="fc-wrapper"
      style={{
        backgroundColor: "#1f2937",
        borderRadius: "12px",
        padding: "clamp(12px, 3vw, 24px)",
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        boxSizing: "border-box",
        overflowX: "auto",
      }}
    >
      <FullCalendar
        ref={calRef}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        height="auto"
        expandRows={true}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        scrollTime={scrollTime}
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        hiddenDays={hiddenDays}
        dayHeaderFormat={{ weekday: "long" }}
        headerToolbar={{
          left:   "prev,next today",
          center: "title",
          right:  ""
        }}
        events={events}
        eventMouseEnter={info => {
          setTooltip({
            x:        info.jsEvent.clientX,
            y:        info.jsEvent.clientY,
            title:    info.event.title,
            division: info.event.extendedProps.division,
            rink:     info.event.extendedProps.rink,
            league:   info.event.extendedProps.league,
          });
        }}
        eventMouseLeave={() => setTooltip(null)}
      />
    </div>
  );
}

const WeeklyCalendar = () => {
  // Stores calendar events built from DB schedule
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tooltip, setTooltip] = useState(null); // { x, y, title, division, rink, league }
  const calRef = useRef(null);

  // Fetch schedule from backend on mount
  useEffect(() => {
    fetchGames()
      .then(data => {
        const calendarEvents = data.map(game => ({
          id:    String(game.GameID),
          title: `${game.HomeTeamName} vs ${game.AwayTeamName}`,
          start: `${game.GameDate.split("T")[0]}T${game.GameTime}`,
          color: getDivColor(game.DivisionName),
          extendedProps: {
            league:   game.LeagueName,
            division: game.DivisionName,
            rink:     game.Rink,
          },
        }));
        setEvents(calendarEvents);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load schedule");
        setLoading(false);
      });
  }, []);

  return (
    <div style={{
      backgroundColor: "#0f2b46",
      width: "100%",
      padding: "clamp(24px, 5vw, 48px) clamp(12px, 4vw, 24px)",
      boxSizing: "border-box",
    }}>
      <style>{`
        .fc-wrapper .fc { width: 100% !important; }
        .fc-wrapper .fc-view-harness { width: 100% !important; }
        .fc-wrapper table { width: 100% !important; }
        .weekly-cal-title {
          font-size: clamp(1.1rem, 4vw, 1.5rem);
          font-weight: bold;
          text-align: center;
          color: white;
          margin-bottom: 24px;
        }
        .fc-wrapper { min-width: 340px; }
        .fc-event-title { font-size: 12px; font-weight: 600; }
        .fc-timegrid-slot { height: 52px !important; }
        .fc-timegrid-slot-label { color: rgba(255,255,255,0.55) !important; font-size: 11px !important; }
        .fc-col-header { background: #1a2535 !important; }
        .fc-col-header-cell { background: #1a2535 !important; border-color: rgba(255,255,255,0.08) !important; }
        .fc-col-header-cell-cushion {
          color: #fff !important;
          font-size: 13px !important;
          font-family: system-ui, sans-serif !important;
          font-weight: 600 !important;
          text-decoration: none !important;
          padding: 8px 0 !important;
          display: block !important;
        }
        .fc-scrollgrid, .fc-scrollgrid td, .fc-scrollgrid th { border-color: rgba(255,255,255,0.08) !important; }
        .fc-timegrid-axis { color: rgba(255,255,255,0.4) !important; }
        .fc-day-today { background: rgba(194,21,55,0.08) !important; }
        .fc-toolbar-title { color: #fff !important; font-size: 16px !important; }
        .fc-button { background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.2) !important; color: #fff !important; border-radius: 6px !important; }
        .fc-button:hover { background: rgba(255,255,255,0.2) !important; }
        .fc-event { border-radius: 5px !important; padding: 3px 6px !important; }
      `}</style>

      <h2 className="weekly-cal-title">Weekly Schedule</h2>

      {/* Loading state while fetch is in progress */}
      {loading && (
        <p style={{ textAlign: "center", color: "white" }}>
          Loading schedule...
        </p>
      )}

      {/* Error state if fetch failed */}
      {error && (
        <p style={{ textAlign: "center", color: "#f87171" }}>
          {error}
        </p>
      )}

      {/* Hover tooltip — positioned via cursor coords, dismissed on mouse-leave */}
      {tooltip && (
        <div
          style={{
            position:     "fixed",
            top:          tooltip.y + 14,
            left:         tooltip.x + 14,
            backgroundColor: "#1e3a5f",
            color:        "white",
            borderRadius: "8px",
            padding:      "10px 14px",
            boxShadow:    "0 4px 16px rgba(0,0,0,0.4)",
            zIndex:       9999,
            pointerEvents: "none",
            minWidth:     "180px",
            fontSize:     "13px",
            lineHeight:   "1.5",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{tooltip.title}</div>
          {tooltip.division && <div>{tooltip.division}</div>}
          {tooltip.league   && <div style={{ color: "#93c5fd" }}>{tooltip.league}</div>}
          {tooltip.rink     && <div style={{ color: "#6ee7b7" }}>{tooltip.rink}</div>}
        </div>
      )}

      {/* Calendar renders only when data is ready */}
      {!loading && !error && <WeeklyCalendarInner events={events} calRef={calRef} setTooltip={setTooltip} />}
    </div>
  );
};

export default WeeklyCalendar;
