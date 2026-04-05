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

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// Division colors — matches LeagueCalendar for consistency
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

// Returns division color or default red if not found
function getDivColor(division) {
  return DIVISION_COLORS[division] || "#c21537";
}

const WeeklyCalendar = () => {
  // Stores calendar events built from DB schedule
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Fetch schedule from backend on mount
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

        // Convert each DB game row into a FullCalendar timeGrid event
        // Combines GameDate + GameTime into a full datetime string
        const calendarEvents = data.map(game => ({
          id:    String(game.GameID),
          title: `${game.HomeTeamName} vs ${game.AwayTeamName}`,
          // e.g. "2026-04-01T18:00:00"
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
      .catch(err => {
        console.error("Error fetching weekly schedule:", err);
        setError("Failed to load schedule");
        setLoading(false);
      });
  }, []); // empty array = only runs once when component mounts

  return (
    <div style={{
      backgroundColor: "#0f2b46",
      width: "100%",
      padding: "48px 24px",
      boxSizing: "border-box",
    }}>
      <style>{`
        .fc-wrapper .fc { width: 100% !important; }
        .fc-wrapper .fc-view-harness { width: 100% !important; }
        .fc-wrapper table { width: 100% !important; }
        .weekly-cal-title {
          font-size: 1.5rem;
          font-weight: bold;
          text-align: center;
          color: white;
          margin-bottom: 24px;
        }
        .fc-event-title { font-size: 11px; }
        .fc-timegrid-slot { height: 40px !important; }
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

      {/* Calendar renders only when data is ready */}
      {!loading && !error && (
        <div
          className="fc-wrapper"
          style={{
            backgroundColor: "#1f2937",
            borderRadius: "12px",
            padding: "24px",
            width: "100%",
            maxWidth: "1100px",
            margin: "0 auto",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            height="auto"
            expandRows={true}
            headerToolbar={{
              left:   "prev,next today",
              center: "title",
              right:  ""
            }}
            events={events}
            // Add rink info as a tooltip on hover
            eventDidMount={info => {
              info.el.title = `${info.event.extendedProps.division} · ${info.event.extendedProps.rink}`;
            }}
          />
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendar;
