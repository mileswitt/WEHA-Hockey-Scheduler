/**
 * roundRobin.js — Pure scheduling functions (no DB dependencies).
 *
 * generateRoundRobin(teamIDs)
 *   Returns an array of rounds. Each round is an array of [homeID, awayID] pairs.
 *   Uses the polygon/circle rotation method so every team plays every other team
 *   exactly once. Adds a null "bye" if the team count is odd.
 *
 * assignGameDates(rounds, startDate, gameDays, gameTime, roundMultiplier)
 *   Returns a flat array of game objects with GameDate and GameTime assigned.
 *   gameDays: array of JS day-of-week integers (0=Sun … 6=Sat), sorted ascending.
 *   roundMultiplier: how many times each pair plays (1 = single round-robin).
 */

// ─── Round-Robin Generator ────────────────────────────────────────────────────

export function generateRoundRobin(teamIDs) {
  const t = [...teamIDs]
  if (t.length % 2 !== 0) t.push(null)  // add bye slot for odd counts
  const N = t.length
  const fixed    = t[0]
  const rotating = t.slice(1)           // length N-1
  const rounds   = []

  for (let r = 0; r < N - 1; r++) {
    const pairs = []

    // Fixed team vs last element of the rotating array in this round
    const fixedOpponent = rotating[(N - 2 - r + (N - 1)) % (N - 1)]
    if (fixed !== null && fixedOpponent !== null) {
      pairs.push([fixed, fixedOpponent])
    }

    // Pair the remaining rotating slots: slot i vs slot (N-2-i)
    for (let i = 0; i < Math.floor((N - 1) / 2); i++) {
      const home = rotating[(r + i) % (N - 1)]
      const away = rotating[(r + N - 2 - i) % (N - 1)]
      if (home !== null && away !== null && home !== away) {
        pairs.push([home, away])
      }
    }

    rounds.push(pairs)
  }

  // Balance home/away: if a team has been home > away + 1, flip that pairing
  const homeCount = {}
  const awayCount = {}
  const balanced  = rounds.map(pairs =>
    pairs.map(([h, a]) => {
      homeCount[h] = (homeCount[h] || 0)
      awayCount[h] = (awayCount[h] || 0)
      homeCount[a] = (homeCount[a] || 0)
      awayCount[a] = (awayCount[a] || 0)
      const flip = (homeCount[h] - awayCount[h]) > 1
      const [home, away] = flip ? [a, h] : [h, a]
      homeCount[home]++
      awayCount[away]++
      return [home, away]
    })
  )

  return balanced
}

// ─── Date Assignment ──────────────────────────────────────────────────────────

// gameTimes can be a string (legacy) or array of time strings.
// When multiple times are provided, games on the same day cycle through them in order.
export function assignGameDates(rounds, startDate, gameDays, gameTimes, rink, seasonID, roundMultiplier = 1, endDate = null, maxGamesPerDay = 1, blackoutDates = []) {
  const times = Array.isArray(gameTimes) ? gameTimes : [gameTimes]
  const needed = rounds.reduce((sum, pairs) => sum + pairs.filter(([h,a]) => h != null && a != null).length, 0) * roundMultiplier
  const slots = buildSlots(startDate, gameDays, needed, endDate, Math.max(1, Number(maxGamesPerDay) || 1), blackoutDates)

  const games = []
  let slotIdx = 0

  for (let m = 0; m < roundMultiplier; m++) {
    for (const pairs of rounds) {
      for (const [homeID, awayID] of pairs) {
        if (homeID == null || awayID == null) continue
        const slot = slots[slotIdx++] || slots[slots.length - 1]
        games.push({
          HomeTeamID:        homeID,
          AwayTeamID:        awayID,
          SeasonID:          seasonID,
          HomeTeamScore:     null,
          AwayTeamScore:     null,
          GameDate:          slot.date,
          GameTime:          times[slot.slotIndex % times.length],
          Rink:              rink || null,
          CurrentGameStatus: 'Draft',
        })
      }
    }
  }

  return games
}

// ─── Seeded Round-Robin ───────────────────────────────────────────────────────
// Like generateRoundRobin but seeds teams by win percentage before pairing,
// producing competitive matchups weighted by current standing. Each game entry
// carries winPctDiff and a competitive quality label ('high'|'medium'|'low').
// teams: array of { TeamID, Name, Wins, Losses, Ties, GamesPlayed }
// Returns flat array of { week, slot, home, away, homeTeamID, awayTeamID, winPctDiff, competitive }
export function seededRoundRobin(teams) {
  const schedule = []

  const calcWinPct = t =>
    t.GamesPlayed ? (t.Wins + (t.Ties || 0) * 0.5) / t.GamesPlayed : 0

  const seeded = teams.map(t => ({ ...t, winPct: calcWinPct(t) }))
  seeded.sort((a, b) => b.winPct - a.winPct)

  for (let i = seeded.length - 1; i > 0; i--) {
    if (seeded[i].winPct === seeded[i - 1].winPct && Math.random() > 0.5) {
      ;[seeded[i], seeded[i - 1]] = [seeded[i - 1], seeded[i]]
    }
  }

  if (seeded.length % 2 !== 0) {
    seeded.push({ Name: 'BYE', TeamID: null, winPct: 0 })
  }

  const n        = seeded.length
  const rounds   = n - 1
  const teamList = seeded.map(t => t.Name)

  for (let r = 0; r < rounds; r++) {
    let slot = 1
    for (let i = 0; i < n / 2; i++) {
      const home = teamList[i]
      const away = teamList[n - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') {
        const top    = seeded[i]
        const bottom = seeded[n - 1 - i]
        const diff   = Math.abs(top.winPct - bottom.winPct)
        schedule.push({
          week:        r + 1,
          slot,
          home,
          away,
          homeTeamID:  top.TeamID,
          awayTeamID:  bottom.TeamID,
          winPctDiff:  diff.toFixed(2),
          competitive: diff < 0.2 ? 'high' : diff < 0.4 ? 'medium' : 'low',
        })
        slot++
      }
    }
    const last = teamList[n - 1]
    for (let i = n - 1; i > 1; i--) teamList[i] = teamList[i - 1]
    teamList[1] = last
  }

  return schedule
}

// Walk forward from startDate yielding {date, slotIndex} objects for dates whose getDay() is in gameDays.
// slotIndex is the 0-based position within each day (used to cycle through multiple game times).
// maxPerDay controls how many games can share the same date.
function buildSlots(startDateStr, gameDays, needed, endDate, maxPerDay, blackoutDates = []) {
  const sorted     = [...gameDays].sort((a, b) => a - b)
  const blackoutSet = new Set(blackoutDates)
  const slots   = []
  const cursor  = new Date(startDateStr + 'T12:00:00')
  const endMs   = endDate ? new Date(endDate + 'T23:59:59').getTime() : null
  const safeMax = new Date(startDateStr + 'T12:00:00')
  safeMax.setFullYear(safeMax.getFullYear() + 10)

  while (slots.length < needed && cursor <= safeMax) {
    if (endMs && cursor.getTime() > endMs) break
    const dateStr = cursor.toISOString().split('T')[0]
    if (sorted.includes(cursor.getDay()) && !blackoutSet.has(dateStr)) {
      for (let i = 0; i < maxPerDay && slots.length < needed; i++) {
        slots.push({ date: dateStr, slotIndex: i })
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return slots
}
