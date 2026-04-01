import express from 'express'
import multer from 'multer'
import { loadPlayersFromCSV } from './csvLoader.js'
import { balanceTeams, formatTeamsResponse } from './teamFairness.js'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.post('/api/generate-teams', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided.' })
  }

  if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
    return res.status(400).json({ error: 'Only CSV files are supported.' })
  }

  const numTeams = parseInt(req.body.num_teams)
  if (isNaN(numTeams) || numTeams < 2) {
    return res.status(400).json({ error: 'num_teams must be a valid integer of at least 2.' })
  }

  let players
  try {
    players = loadPlayersFromCSV(req.file.buffer)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  let teams
  try {
    teams = balanceTeams(players, numTeams)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  return res.json({
    teams: formatTeamsResponse(teams),
    num_teams: numTeams,
    total_players: players.length
  })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})