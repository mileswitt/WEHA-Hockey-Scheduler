// Balance teams ensuring:
// 1. Each team gets exactly one goalie (if enough goalies exist)
// 2. Teams are as even in size as possible
// 3. Field player skill is balanced across teams
// 4. Goalie skill is balanced across teams

export function balanceTeams(players, numTeams) {
  if (!players || players.length === 0) throw new Error('No players provided.')
  if (numTeams < 2) throw new Error('Must have at least 2 teams.')
  if (players.length < numTeams) throw new Error(`Not enough players (${players.length}) for ${numTeams} teams.`)

  const goalies      = players.filter(p => p.isGoalie)
  const fieldPlayers = players.filter(p => !p.isGoalie)

  // Sort goalies by skill descending (best goalie first for snake draft)
  const sortedGoalies = [...goalies].sort((a, b) => b.skill - a.skill)
  // Sort field players by skill descending
  const sortedField  = [...fieldPlayers].sort((a, b) => b.skill - a.skill)

  // Initialize teams
  const teams = Array.from({ length: numTeams }, (_, i) => ({
    index: i,
    players: [],
    totalSkill: 0,
    hasGoalie: false,
    maxSize: 0,
  }))

  // --- Step 1: Assign one goalie per team (snake draft order) ---
  // Snake draft: round 1 goes 0,1,2,...,n-1 then round 2 goes n-1,...,1,0
  let direction = 1
  let teamIdx = 0
  const assignedGoalies = sortedGoalies.slice(0, numTeams)
  const extraGoalies    = sortedGoalies.slice(numTeams) // leftover goalies go into field pool

  for (const goalie of assignedGoalies) {
    teams[teamIdx].players.push(goalie)
    teams[teamIdx].totalSkill += goalie.skill
    teams[teamIdx].hasGoalie = true

    teamIdx += direction
    if (teamIdx >= numTeams) { teamIdx = numTeams - 1; direction = -1 }
    if (teamIdx < 0)         { teamIdx = 0;            direction = 1  }
  }

  // Add extra goalies back into the field player pool
  const allField = [...sortedField, ...extraGoalies].sort((a, b) => b.skill - a.skill)

  // --- Step 2: Pre-calculate max sizes for even distribution ---
  const remaining = allField.length
  const totalPlayers = players.length
  const base  = Math.floor(totalPlayers / numTeams)
  const extra = totalPlayers % numTeams

  for (let i = 0; i < numTeams; i++) {
    // Each team already has 0 or 1 goalie — max size accounts for that
    const targetTotal = base + (i < extra ? 1 : 0)
    teams[i].maxSize = targetTotal
  }

  // --- Step 3: Assign field players to teams with lowest skill, respecting max size ---
  for (const player of allField) {
    const eligible = teams.filter(t => t.players.length < t.maxSize)
    if (eligible.length === 0) break

    const target = eligible.reduce((min, t) =>
      t.totalSkill < min.totalSkill ? t : min
    )
    target.players.push(player)
    target.totalSkill += player.skill
  }

  // --- Step 4: Build final output ---
  return teams.map(team => {
    const size = team.players.length
    const goalieCount = team.players.filter(p => p.isGoalie).length
    // Average only field players — goalie skill (10-GAA scale) and field skill (PPG scale) are not comparable
    const fieldPlayers = team.players.filter(p => !p.isGoalie)
    const avgSkill = fieldPlayers.length > 0
      ? Math.round((fieldPlayers.reduce((s, p) => s + p.skill, 0) / fieldPlayers.length) * 1000) / 1000
      : 0

    return {
      players: team.players,
      avg_skill: avgSkill,
      avg_experience: avgSkill, // keep legacy field for dashboard compatibility
      size,
      goalieCount,
      hasGoalie: goalieCount > 0,
    }
  })
}

export function formatTeamsResponse(teams) {
  return Object.fromEntries(teams.map((team, i) => [`team${i + 1}`, team]))
}