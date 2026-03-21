import { useState } from 'react'

export default function Dashboard({ allTeams }) {
  const [selectedDivision, setSelectedDivision] = useState('All')
  const [selectedTeam, setSelectedTeam] = useState(null)

  const divisions = Object.keys(allTeams)

  // Get teams for selected division or flatten all
  const teamList = selectedDivision === 'All'
    ? divisions.flatMap(div =>
        Object.entries(allTeams[div]).map(([key, team]) => ({
          key: `${div}-${key}`,
          team,
          division: div
        }))
      )
    : allTeams[selectedDivision]
      ? Object.entries(allTeams[selectedDivision]).map(([key, team]) => ({
          key: `${selectedDivision}-${key}`,
          team,
          division: selectedDivision
        }))
      : []

  const totalPlayers = teamList.reduce((acc, { team }) => acc + team.players.length, 0)

  const getSelectedTeamData = () => {
    if (!selectedTeam) return null
    const entry = teamList.find(t => t.key === selectedTeam)
    return entry ? entry.team : null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>

        {/* Division Filter */}
        {divisions.length > 0 && (
          <select
            value={selectedDivision}
            onChange={e => { setSelectedDivision(e.target.value); setSelectedTeam(null) }}
            className="p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm"
          >
            <option value="All">All Divisions</option>
            {divisions.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded">
          <p className="text-gray-400 text-sm mb-1">Teams</p>
          <p className="text-2xl font-bold">{teamList.length || '—'}</p>
          {selectedDivision !== 'All' && (
            <p className="text-gray-500 text-xs mt-1">{selectedDivision}</p>
          )}
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <p className="text-gray-400 text-sm mb-1">Players</p>
          <p className="text-2xl font-bold">{totalPlayers || '—'}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <p className="text-gray-400 text-sm mb-1">Games</p>
          <p className="text-2xl font-bold">—</p>
        </div>
      </div>

      {/* Teams Section */}
      {teamList.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Teams
            <span className="ml-2 text-sm text-gray-400 font-normal">
              — click a team to view players
            </span>
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {teamList.map(({ key, team, division }, i) => (
              <div
                key={key}
                onClick={() => setSelectedTeam(selectedTeam === key ? null : key)}
                className={`bg-gray-800 p-4 rounded-lg cursor-pointer border-2 transition-all ${
                  selectedTeam === key
                    ? 'border-red-500'
                    : 'border-transparent hover:border-gray-600'
                }`}
              >
                <p className="font-semibold text-white mb-1">Team {i + 1}</p>
                <p className="text-xs text-red-400 mb-2">{division}</p>
                <p className="text-gray-400 text-sm">{team.players.length} players</p>
                <p className="text-gray-500 text-xs mt-1">Avg exp: {team.avg_experience} yrs</p>
              </div>
            ))}
          </div>

          {/* Expanded Team View */}
          {selectedTeam && getSelectedTeamData() && (
            <div className="mt-6 bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Team {teamList.findIndex(t => t.key === selectedTeam) + 1}
                  <span className="ml-2 text-sm text-red-400 font-normal">
                    {teamList.find(t => t.key === selectedTeam)?.division}
                  </span>
                </h3>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="text-gray-400 hover:text-white text-sm transition"
                >
                  ✕ Close
                </button>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2">Years Experience</th>
                  </tr>
                </thead>
                <tbody>
                  {getSelectedTeamData().players.map((player, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-700/50 ${i % 2 === 0 ? '' : 'bg-gray-700/30'}`}
                    >
                      <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                      <td className="py-2 pr-4 text-white">{player.name}</td>
                      <td className="py-2 text-gray-300">{player.experience} yrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-3 border-t border-gray-700 text-sm text-gray-400">
                Avg experience:{' '}
                <span className="text-white font-medium">
                  {getSelectedTeamData().avg_experience} years
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded-lg text-center text-gray-500">
          No teams generated yet. Go to{' '}
          <a href="/upload" className="text-red-400 hover:underline">Upload</a>{' '}
          to create teams.
        </div>
      )}
    </div>
  )
}