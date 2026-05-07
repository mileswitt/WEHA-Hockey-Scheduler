import { useState, useEffect, useMemo } from "react";

export default function Standings() {
  const [allRows, setAllRows]   = useState([]);
  const [seasons, setSeasons]   = useState([]);
  const [seasonID, setSeasonID] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeDivision, setActiveDivision] = useState("All");

  // Fetch available seasons first
  useEffect(() => {
    fetch("/api/getSeasons")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSeasons(data);
          // Prefer the most recent season that has games scheduled; fall back to highest SeasonID
          const withGames = data.filter(s => s.LastGameDate);
          const pool = withGames.length > 0 ? withGames : data;
          const latest = pool.reduce((a, b) => (b.SeasonID > a.SeasonID ? b : a));
          setSeasonID(latest.SeasonID);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch standings whenever seasonID changes
  useEffect(() => {
    if (!seasonID) return;
    setLoading(true);
    setError(null);
    fetch(`/api/standings?seasonID=${seasonID}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAllRows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [seasonID]);

  // Build list of unique division names for filter tabs
  const divisions = useMemo(() => {
    const names = [...new Set(allRows.map(r => r.DivisionName))].sort();
    return ["All", ...names];
  }, [allRows]);

  // Reset division filter if it's no longer in the list
  useEffect(() => {
    if (!divisions.includes(activeDivision)) setActiveDivision("All");
  }, [divisions, activeDivision]);

  // Group rows by division for display
  const groupedRows = useMemo(() => {
    const rows = activeDivision === "All"
      ? allRows
      : allRows.filter(r => r.DivisionName === activeDivision);

    // Group by division, sort each group by Pts desc
    const groups = {};
    for (const row of rows) {
      const div = row.DivisionName;
      if (!groups[div]) groups[div] = [];
      groups[div].push({ ...row, Pts: row.Wins * 2 + row.Ties });
    }
    for (const div of Object.keys(groups)) {
      groups[div].sort((a, b) =>
        b.Pts - a.Pts || b.Wins - a.Wins || a.Losses - b.Losses || a.TeamName.localeCompare(b.TeamName)
      );
    }
    return groups;
  }, [allRows, activeDivision]);

  const hasAnyGames = allRows.some(r => r.GamesPlayed > 0);

  return (
    <section className="py-14 md:py-20 w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-white mb-2"
        >
          League Standings
        </h2>
        <p className="text-center text-white/50 text-sm mb-8">
          {seasons.find(s => s.SeasonID === seasonID)?.Name ?? "Season"} standings — updated as games are completed
        </p>

        {/* Season picker */}
        {seasons.length > 1 && (
          <div className="flex justify-center mb-6">
            <select
              className="bg-white/10 text-white text-sm rounded px-3 py-2 border border-white/20 focus:outline-none"
              value={seasonID ?? ""}
              onChange={e => setSeasonID(Number(e.target.value))}
            >
              {seasons.map(s => (
                <option key={s.SeasonID} value={s.SeasonID} style={{ background: "#0f2b46" }}>
                  {s.Name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Division filter tabs */}
        {!loading && divisions.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {divisions.map(d => (
              <button
                key={d}
                onClick={() => setActiveDivision(d)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeDivision === d
                    ? "bg-red-600 border-red-600 text-white"
                    : "border-white/20 text-white/60 hover:text-white hover:border-white/40"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-center text-white/50 py-12">Loading standings…</p>
        ) : error ? (
          <p className="text-center text-red-400 py-12">{error}</p>
        ) : !hasAnyGames ? (
          <div
            className="text-center py-12 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <p className="text-white/50 text-sm">No completed games yet — standings will appear here once games have been played.</p>
          </div>
        ) : Object.keys(groupedRows).length === 0 ? (
          <p className="text-center text-white/50 py-12">No teams found for this filter.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedRows).map(([division, teams]) => (
              <DivisionTable key={division} division={division} teams={teams} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DivisionTable({ division, teams }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      {/* Division header */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ background: "rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <span className="text-white font-bold text-sm tracking-wide">{division}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <th className="px-5 py-2 text-left text-xs text-white/40 font-medium uppercase tracking-wide w-6">#</th>
              <th className="px-5 py-2 text-left text-xs text-white/40 font-medium uppercase tracking-wide">Team</th>
              <th className="px-4 py-2 text-center text-xs text-white/40 font-medium uppercase tracking-wide">GP</th>
              <th className="px-4 py-2 text-center text-xs text-white/40 font-medium uppercase tracking-wide">W</th>
              <th className="px-4 py-2 text-center text-xs text-white/40 font-medium uppercase tracking-wide">L</th>
              <th className="px-4 py-2 text-center text-xs text-white/40 font-medium uppercase tracking-wide">T</th>
              <th className="px-4 py-2 text-center text-xs text-white/40 font-medium uppercase tracking-wide">Pts</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => {
              const isFirst = i === 0 && team.GamesPlayed > 0;
              return (
                <tr
                  key={team.ScheduledTeamID}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: isFirst ? "rgba(220,38,38,0.1)" : "transparent",
                  }}
                >
                  <td className="px-5 py-3 text-white/30 text-xs">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {isFirst && (
                        <span className="text-yellow-400 text-xs">★</span>
                      )}
                      <span className={`text-sm font-semibold ${isFirst ? "text-white" : "text-white/80"}`}>
                        {team.TeamName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-white/60">{team.GamesPlayed}</td>
                  <td className="px-4 py-3 text-center text-sm text-green-400 font-semibold">{team.Wins}</td>
                  <td className="px-4 py-3 text-center text-sm text-red-400">{team.Losses}</td>
                  <td className="px-4 py-3 text-center text-sm text-white/60">{team.Ties}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-white">{team.Pts}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-2 text-right" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="text-white/25 text-xs">2 pts per win · 1 pt per tie</span>
      </div>
    </div>
  );
}
