export function balanceTeams(players, numTeams) {
  if (!players || players.length === 0) throw new Error('No players provided.')
  if (numTeams < 2) throw new Error('Must have at least 2 teams.')
  if (players.length < numTeams) throw new Error(`Not enough players (${players.length}) for ${numTeams} teams.`)

  const sorted = [...players].sort((a, b) => b.experience - a.experience)

  const n = sorted.length
  const baseSize = Math.floor(n / numTeams)
  const extra = n % numTeams

  const maxSizes = Array.from({ length: numTeams }, (_, i) =>
    baseSize + (i < extra ? 1 : 0)
  )

  const teams = Array.from({ length: numTeams }, (_, i) => ({
    players: [],
    totalExperience: 0,
    maxSize: maxSizes[i]
  }))

  for (const player of sorted) {
    const eligible = teams.filter(t => t.players.length < t.maxSize)
    const target = eligible.reduce((min, t) =>
      t.totalExperience < min.totalExperience ? t : min
    )
    target.players.push(player)
    target.totalExperience += player.experience
  }

  return teams.map(team => ({
    players: team.players,
    avg_experience: team.players.length > 0
      ? Math.round((team.totalExperience / team.players.length) * 100) / 100
      : 0,
    size: team.players.length
  }))
}

export function formatTeamsResponse(teams) {
  return Object.fromEntries(teams.map((team, i) => [`team${i + 1}`, team]))
}