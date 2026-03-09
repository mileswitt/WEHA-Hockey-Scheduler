import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

const WeeklyCalendar = () => {
  return (
    <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg max-w-6xl mx-auto my-12">

      <h2 className="text-2xl font-bold mb-6 text-center">
        Weekly Schedule
      </h2>

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        height="auto"

        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: ""
        }}

        events={[
          {
            title: "Varsity Practice",
            start: "2026-03-02T16:00:00",
            end: "2026-03-02T18:00:00"
          },
          {
            title: "JV Practice",
            start: "2026-03-03T15:00:00",
            end: "2026-03-03T17:00:00"
          },
          {
            title: "Home Game",
            start: "2026-03-05T19:00:00",
            end: "2026-03-05T21:00:00"
          }
        ]}
      />

    </div>
  )
}

export default WeeklyCalendar