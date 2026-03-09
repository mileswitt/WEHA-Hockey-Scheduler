import { useState } from "react";

export default function UpcomingEvents() {

  // Store selected division
  const [division, setDivision] = useState("team_10U");

  // Store returned schedule
  const [schedule, setSchedule] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(false);


  // Call Flask backend
  const generateSchedule = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `https://weha-hockey-scheduler-c9h3.onrender.com/generate/${division}`
      );

      const data = await response.json();
      setSchedule(data);

    } catch (error) {
      console.error("Error fetching schedule:", error);
    }

    setLoading(false);
  };


  return (
    <section className="py-20">

      <h2 className="text-4xl font-bold text-center text-white mb-12">
        Upcoming Games
      </h2>

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-8">

        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          className="px-4 py-2 rounded-lg"
        >
          <option value="team_6U">6U</option>
          <option value="team_8U">8U</option>
          <option value="team_10U">10U</option>
          <option value="team_12U">12U</option>
          <option value="team_14U">14U</option>
          <option value="team_18U">18U</option>
          <option value="team_19U">19U</option>
          <option value="team_TownLeagueAandB">Town League A/B</option>
          <option value="team_CandBTownLeague">Town League C/B</option>
          <option value="team_GunnisonWinterLeagueA">Gunnison Winter League A</option>
          <option value="team_GunnisonWinterLeagueB">Gunnison Winter League B</option>
          <option value="team_GunnisonWinterLeagueC">Gunnison Winter League C</option>
        </select>

        <button
          onClick={generateSchedule}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow-lg transition"
        >
          Generate Schedule
        </button>
      </div>

      {loading && (
        <p className="text-center text-white mb-6">
          Generating schedule...
        </p>
      )}

      <div className="bg-gradient-to-r from-red-600 via-purple-700 to-blue-800 
                      rounded-3xl p-10 shadow-2xl">

        <div className="grid md:grid-cols-3 gap-8">

          {/* If schedule exists, show real games */}
          {schedule.length > 0 ? (
            schedule.map((game, index) => (
              <GameCard
                key={index}
                date={`Week ${game.week}`}
                team={`${game.home} vs ${game.away}`}
                time={`Ice Slot ${game.slot}`}
              />
            ))
          ) : (
            // Default placeholder cards before generating
            <>
              <GameCard
                date="Feb 5"
                team="West Elk vs Gunnison"
                time="7:00 PM"
              />
              <GameCard
                date="Feb 8"
                team="West Elk vs Aspen"
                time="6:00 PM"
              />
              <GameCard
                date="Feb 12"
                team="West Elk vs Telluride"
                time="8:00 PM"
              />
            </>
          )}

        </div>
      </div>
    </section>
  );
}


// Reusable card component
function GameCard({ date, team, time }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:scale-105 transition">

      <h3 className="text-xl font-bold text-gray-900">
        {date}
      </h3>

      <p className="mt-2 text-gray-800">
        {team}
      </p>

      <p className="text-gray-600 mt-1">
        {time}
      </p>
    </div>
  );
}