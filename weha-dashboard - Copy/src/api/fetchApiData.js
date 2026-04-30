// Helper functions to fetch data from the backend API.
// Used by LeagueCalendar, WeeklyCalendar, and UpcomingEvents.

const CACHE_KEY = 'weha_schedule_v1'
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// Fetch the published game schedule (Scheduled status only).
// Returns cached data from localStorage when fresh, otherwise fetches from the server.
export const fetchGames = async () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const { data, expires } = JSON.parse(raw)
      if (Date.now() < expires) return data
    }
  } catch {
    // localStorage unavailable or corrupted — fall through to network
  }

  const response = await fetch('/api/schedule')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  if (data.error) throw new Error(data.error)

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, expires: Date.now() + CACHE_TTL }))
  } catch {
    // localStorage full — just return the data without caching
  }

  return data
}

// Call this after the admin publishes or changes games so the next calendar
// load fetches fresh data instead of serving the stale cached version.
export const clearScheduleCache = () => {
  try { localStorage.removeItem(CACHE_KEY) } catch {}
}
