// ─── Install: npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction
// ─── Place at: src/components/LeagueCalendar.jsx

// src/components/LeagueCalendar.jsx
// Mobile responsive league calendar with dropdown filters

import { useState, useEffect } from "react";
import { fetchGames } from "../api/fetchApiData";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

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
  return DIVISION_COLORS[division] || "#888";
}

function GameModal({ event, onClose }) {
  const color = getDivColor(event.extendedProps.division);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)" }} onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-md p-6 text-white overflow-y-auto"
        style={{
          background: "#0d1b2a", boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          maxHeight: "88vh", border: "3px solid rgba(255,255,255,0.7)",
          fontFamily: "'Bebas Neue', Impact, sans-serif",
        }}
        onClick={e => e.stopPropagation()}>

        <button onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
          style={{ background: "rgba(255,255,255,0.1)" }}>✕</button>

        <div className="text-center mb-3">
          <span className="text-xs px-2 py-1 text-white tracking-widest" style={{ background: color }}>
            {event.extendedProps.division}
          </span>
          <span className="text-xs px-2 py-1 rounded text-white tracking-widest ml-1"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            {event.extendedProps.league}
          </span>
        </div>

        <h2 className="text-center tracking-wide leading-tight mb-1">{event.extendedProps.home}</h2>
        <p className="text-center text-white/50 mb-1" style={{ fontFamily: "system-ui,sans-serif" }}>vs</p>
        <h2 className="text-center tracking-wide leading-tight mb-1">{event.extendedProps.away}</h2>
        <p className="text-center text-white/50 mb-4" style={{ fontFamily: "system-ui,sans-serif", fontSize: 13 }}>
          {event.extendedProps.time} · {event.extendedProps.rink}
        </p>

        <div className="flex items-center gap-2">
          {['home', 'away'].map(side => (
            <div key={side} className="flex-1 rounded-md p-3 text-center"
              style={{ background: "rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 13 }}>{event.extendedProps[side]}</div>
              <div className="text-xs text-white/40 mt-1" style={{ fontFamily: "system-ui,sans-serif" }}>
                {side === 'home' ? 'Home' : 'Away'}
              </div>
              <div className="flex justify-center gap-2 mt-2">
                <span className="text-xs text-white/40">{event.extendedProps[`${side}Wins`]} W</span>
                <span className="text-xs text-white/40">{event.extendedProps[`${side}Losses`]} L</span>
                <span className="text-xs text-white/40">{event.extendedProps[`${side}Ties`]} T</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LeagueCalendar() {
  const [events,         setEvents]         = useState([]);
  const [leagues,        setLeagues]        = useState(["All Leagues"]);
  const [divisions,      setDivisions]      = useState(["All Divisions"]);
  const [activeLeague,   setActiveLeague]   = useState("All Leagues");
  const [activeDivision, setActiveDivision] = useState("All Divisions");
  const [selectedEvent,  setSelectedEvent]  = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [isMobile,       setIsMobile]       = useState(false);

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
          id:              String(game.GameID),
          title:           `${game.HomeTeamName} vs ${game.AwayTeamName}`,
          start:           game.GameDate.split("T")[0],
          backgroundColor: getDivColor(game.DivisionName),
          borderColor:     "transparent",
          textColor:       "#fff",
          extendedProps: {
            league:      game.LeagueName,
            division:    game.DivisionName,
            home:        game.HomeTeamName,
            away:        game.AwayTeamName,
            time:        game.GameTime,
            rink:        game.RinkLocation,
            homeWins:    game.HomeWins    ?? 0,
            homeLosses:  game.HomeLosses  ?? 0,
            homeTies:    game.HomeTies    ?? 0,
            awayWins:    game.AwayWins    ?? 0,
            awayLosses:  game.AwayLosses  ?? 0,
            awayTies:    game.AwayTies    ?? 0,
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

  const filteredEvents = events.filter(e => {
    const leagueMatch = activeLeague   === "All Leagues"   || e.extendedProps.league   === activeLeague;
    const divMatch    = activeDivision === "All Divisions" || e.extendedProps.division === activeDivision;
    return leagueMatch && divMatch;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-red-700">
      <p className="text-white text-2xl tracking-widest" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
        Loading Schedule...
      </p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-red-700">
      <p className="text-white text-2xl tracking-widest" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
        Error: {error}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen w-full pb-16 flex flex-col items-center"
      style={{ background: "#CC1010", fontFamily: "'Bebas Neue', Impact, sans-serif",
        letterSpacing: "0.04em", padding: isMobile ? '24px 12px' : '32px 24px' }}>

      <style>{CALENDAR_CSS}</style>

      <h1 className="text-center text-white tracking-widest"
        style={{ fontSize: isMobile ? '1.8rem' : '3rem', marginBottom: 4,
          textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
        WCHL LEAGUE SCHEDULE
      </h1>
      <p className="text-center text-white/60 tracking-widest"
        style={{ fontFamily: "system-ui,sans-serif", fontSize: isMobile ? 11 : 12, marginBottom: 20 }}>
        Western Colorado Hockey League · 2025–26 Season
      </p>

      {/* Dropdowns */}
      <div style={{
        display:        'flex',
        gap:            12,
        marginBottom:   20,
        flexDirection:  isMobile ? 'column' : 'row',
        width:          isMobile ? '100%' : 'auto',
        maxWidth:       '100%',
      }}>
        {/* League dropdown */}
        <div style={{ position: 'relative', width: isMobile ? '100%' : 'auto' }}>
          <select value={activeLeague}
            onChange={e => { setActiveLeague(e.target.value); setActiveDivision("All Divisions"); }}
            style={{
              background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: 8, color: '#fff', padding: '10px 36px 10px 14px',
              fontSize: 13, letterSpacing: '0.06em', cursor: 'pointer', appearance: 'none',
              width: isMobile ? '100%' : '220px', fontFamily: "'Bebas Neue', Impact, sans-serif",
            }}>
            {leagues.map(l => (
              <option key={l} value={l} style={{ background: '#0d1b2a', color: '#fff' }}>{l}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: '#fff', fontSize: 10 }}>▼</span>
        </div>

        {/* Division dropdown */}
        <div style={{ position: 'relative', width: isMobile ? '100%' : 'auto' }}>
          <select value={activeDivision} onChange={e => setActiveDivision(e.target.value)}
            style={{
              background: activeDivision !== "All Divisions" && DIVISION_COLORS[activeDivision]
                ? DIVISION_COLORS[activeDivision] : 'rgba(255,255,255,0.15)',
              border: `2px solid ${activeDivision !== "All Divisions" && DIVISION_COLORS[activeDivision]
                ? DIVISION_COLORS[activeDivision] : 'rgba(255,255,255,0.3)'}`,
              borderRadius: 8, color: '#fff', padding: '10px 36px 10px 14px',
              fontSize: 13, letterSpacing: '0.06em', cursor: 'pointer', appearance: 'none',
              width: isMobile ? '100%' : '220px', fontFamily: "'Bebas Neue', Impact, sans-serif",
            }}>
            {divisions.map(d => (
              <option key={d} value={d} style={{ background: '#0d1b2a', color: '#fff' }}>{d}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: '#fff', fontSize: 10 }}>▼</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl w-full mx-auto"
        style={{
          background: "#0d1b2a", boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: isMobile ? 8 : 12,
          maxWidth: isMobile ? '100%' : '896px',
        }}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate="2026-04-01"
          events={filteredEvents}
          eventClick={info => setSelectedEvent(info.event)}
          headerToolbar={{ left: "prev", center: "title", right: "next" }}
          height="auto"
          dayMaxEvents={isMobile ? 1 : 3}
          dayHeaderFormat={{ weekday: isMobile ? 'short' : 'long' }}
        />
      </div>

      {/* Legend — hidden on mobile to save space */}
      {!isMobile && (
        <div className="flex justify-center flex-wrap gap-5 w-full max-w-4xl mx-auto mt-4">
          {Object.entries(DIVISION_COLORS).map(([div, color]) => (
            <div key={div} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
              <span className="text-xs text-white/70 tracking-widest">{div}</span>
            </div>
          ))}
        </div>
      )}

      {selectedEvent && <GameModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}

const CALENDAR_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
  .fc { font-family: 'Bebas Neue', Impact, sans-serif; letter-spacing: 0.04em; }
  .fc-toolbar-title { color: #fff !important; font-size: 18px !important; letter-spacing: 0.1em; }
  .fc-button { background: rgba(255,255,255,0.12) !important; border: 1px solid rgba(255,255,255,0.2) !important; color: #fff !important; border-radius: 6px !important; padding: 4px 10px !important; }
  .fc-button:hover { background: rgba(255,255,255,0.22) !important; }
  .fc-col-header { background: #0d1b2a !important; }
  .fc-col-header-cell { background: #162032 !important; border-color: rgba(255,255,255,0.08) !important; padding: 6px 0 !important; }
  .fc-col-header-cell-cushion { color: #fff !important; font-size: 12px !important; letter-spacing: 0.05em !important; font-family: system-ui, sans-serif !important; font-weight: 600 !important; display: block !important; padding: 6px 0 !important; text-decoration: none !important; }
  .fc-daygrid-day { background: #0d1b2a !important; border-color: rgba(255,255,255,0.08) !important; }
  .fc-daygrid-day:hover { background: #122336 !important; }
  .fc-day-other .fc-daygrid-day-number { color: rgba(255,255,255,0.2) !important; }
  .fc-daygrid-day-number { color: rgba(255,255,255,0.7) !important; font-size: 11px; padding: 3px 5px !important; text-decoration: none !important; }
  .fc-event { border-radius: 3px !important; padding: 1px 4px !important; font-size: 9px !important; cursor: pointer !important; border: none !important; }
  .fc-event:hover { opacity: 0.85; }
  .fc-scrollgrid, .fc-scrollgrid td, .fc-scrollgrid th { border-color: rgba(255,255,255,0.08) !important; }
  .fc-today-button { display: none !important; }
  .fc-daygrid-day.fc-day-today { background: #0f2236 !important; }
  .fc-more-link { color: rgba(255,255,255,0.55) !important; font-size: 9px; }
  @media (max-width: 768px) {
    .fc-toolbar-title { font-size: 14px !important; }
    .fc-event { font-size: 8px !important; padding: 1px 2px !important; }
    .fc-daygrid-day-number { font-size: 10px !important; }
  }
`;
