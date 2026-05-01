// import FullCalendar from "@fullcalendar/react";
// import timeGridPlugin from "@fullcalendar/timegrid";
// import interactionPlugin from "@fullcalendar/interaction";
// Mobile responsive weekly schedule calendar

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { fetchGames } from "../api/fetchApiData";

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

function getDivColor(division) {
  return DIVISION_COLORS[division] || "#c21537";
}

const WeeklyCalendar = () => {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
            rink:     game.RinkLocation,
          },
        }));
        setEvents(calendarEvents);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load schedule"); setLoading(false); });
  }, []);

  return (
    <div style={{
      backgroundColor: "#0f2b46",
      width:           "100%",
      padding:         isMobile ? "32px 12px" : "48px 24px",
      boxSizing:       "border-box",
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
          margin-bottom: 20px;
        }
        .fc-event-title { font-size: 10px; }
        .fc-timegrid-slot { height: 36px !important; }
        .fc-col-header { background: #1a2535 !important; }
        .fc-col-header-cell { background: #1a2535 !important; border-color: rgba(255,255,255,0.08) !important; }
        .fc-col-header-cell-cushion {
          color: #fff !important; font-size: 12px !important;
          font-family: system-ui, sans-serif !important; font-weight: 600 !important;
          text-decoration: none !important; padding: 6px 0 !important; display: block !important;
        }
        .fc-timegrid-axis { background: #1f2937 !important; }
        .fc-timegrid-slot-label { color: rgba(255,255,255,0.5) !important; font-size: 10px !important; }
        .fc-scrollgrid, .fc-scrollgrid td, .fc-scrollgrid th { border-color: rgba(255,255,255,0.08) !important; }
        .fc-toolbar-title { color: #fff !important; font-size: clamp(13px, 3vw, 18px) !important; }
        .fc-button { background: rgba(255,255,255,0.12) !important; border: 1px solid rgba(255,255,255,0.2) !important; color: #fff !important; border-radius: 6px !important; font-size: 12px !important; padding: 4px 8px !important; }
        .fc-button:hover { background: rgba(255,255,255,0.22) !important; }
        .fc-timegrid-col { background: #1f2937 !important; }
        .fc-day-today { background: #243044 !important; }
        .fc-timegrid-col.fc-day-today { background: #243044 !important; }
        @media (max-width: 768px) {
          .fc-timegrid-slot { height: 28px !important; }
          .fc-event-title { font-size: 8px !important; }
        }
      `}</style>

      <h2 className="weekly-cal-title">Weekly Schedule</h2>

      {loading && <p style={{ textAlign: "center", color: "white" }}>Loading schedule...</p>}
      {error   && <p style={{ textAlign: "center", color: "#f87171" }}>{error}</p>}

      {!loading && !error && (
        <div className="fc-wrapper" style={{
          backgroundColor: "#1f2937",
          borderRadius:    "12px",
          padding:         isMobile ? "12px 8px" : "24px",
          width:           "100%",
          maxWidth:        "1100px",
          margin:          "0 auto",
          boxSizing:       "border-box",
          overflow:        "hidden",
        }}>
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
            height="auto"
            expandRows={true}
            headerToolbar={{
              left:   "prev,next today",
              center: "title",
              right:  isMobile ? "timeGridDay,timeGridWeek" : "",
            }}
            views={{
              timeGridDay:  { buttonText: 'Day'  },
              timeGridWeek: { buttonText: 'Week' },
            }}
            events={events}
            dayHeaderFormat={{ weekday: isMobile ? 'short' : 'long' }}
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


