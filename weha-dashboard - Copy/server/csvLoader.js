import { parse } from 'csv-parse/sync'

const REQUIRED_COLUMNS = ['First', 'Last', 'YEARS PLAYED']

function cleanExperience(val) {
  if (!val || val.toString().trim() === '') return 0
  const match = val.toString().match(/\d+/)
  return match ? parseInt(match[0]) : 0
}

function validateColumns(headers) {
  const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
  if (missing.length > 0) throw new Error(`CSV is missing required columns: ${missing.join(', ')}`)
}

export function loadPlayersFromCSV(buffer) {
  let records
  try {
    records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  } catch (e) {
    throw new Error(`Could not parse CSV: ${e.message}`)
  }

  if (records.length === 0) throw new Error('CSV file is empty.')

  validateColumns(Object.keys(records[0]))

  const players = records
    .map(row => ({
      name: `${(row['First'] || '').trim()} ${(row['Last'] || '').trim()}`.trim(),
      experience: cleanExperience(row['YEARS PLAYED'])
    }))
    .filter(p => p.name !== '')

  if (players.length === 0) throw new Error('No valid players found in the CSV.')

  return players
}