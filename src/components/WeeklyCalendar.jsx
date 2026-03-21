import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

const WeeklyCalendar = () => {
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
      `}</style>

      <h2 className="weekly-cal-title">Weekly Schedule</h2>

      <div style={{
        backgroundColor: "#1f2937",
        borderRadius: "12px",
        padding: "24px",
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
        className="fc-wrapper"
      >
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          height="auto"
          expandRows={true}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: ""
          }}
          events={[
            {
              title: "Varsity Practice",
              start: "2026-03-02T16:00:00",
              end:   "2026-03-02T18:00:00",
              color: "#c21537",
            },
            {
              title: "JV Practice",
              start: "2026-03-03T15:00:00",
              end:   "2026-03-03T17:00:00",
              color: "#1d4ed8",
            },
            {
              title: "Home Game",
              start: "2026-03-05T19:00:00",
              end:   "2026-03-05T21:00:00",
              color: "#16a34a",
            }
          ]}
        />
      </div>
    </div>
  )
}

export default WeeklyCalendar