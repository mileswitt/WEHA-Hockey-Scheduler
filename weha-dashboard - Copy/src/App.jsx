import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/Authentication'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import GenerateTeams from './pages/GenerateTeams'
import Settings from './pages/Settings'
import Login from './pages/Login'
import WebScraper from './pages/WebScraper'
import ScheduleManager from './pages/ScheduleManager'
import HomePage from './pages/HomePage'
import LeagueCalendarPage from './pages/LeagueCalendarPage'
import TeamPage from './pages/TeamPage'
import Sidebar from './components/Sidebar'

function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}

export default function App() {
  // Teams stored as:
  // { [leagueName]: { [divisionName]: { [teamKey]: teamData } } }
  const [allTeams, setAllTeams] = useState({})
  // true once the initial DB hydration fetch completes (success or failure)
  const [teamsLoaded, setTeamsLoaded] = useState(false)

  // Hydrate draft teams from DB on mount so teams survive page refreshes.
  // Merges into existing state so any teams already added in this render cycle are kept.
  useEffect(() => {
    fetch('/api/draft-teams')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (data && typeof data === 'object' && !data.error) {
          setAllTeams(prev => {
            // Deep-merge DB data under any keys not already present in current state.
            // Keys already in state (teams generated this session before hydration)
            // take priority so we never overwrite in-session work.
            const merged = { ...data }
            for (const [league, divMap] of Object.entries(prev)) {
              merged[league] = { ...(merged[league] || {}), ...divMap }
            }
            return merged
          })
        }
      })
      .catch(err => console.error('[draft-teams hydration failed]', err))
      .finally(() => setTeamsLoaded(true))
  }, [])

  // Called from Upload/GenerateTeams — teamsData is the raw teams object from the API
  // divisionKey is "League Name — Division Name" for display
  // leagueName and divisionName are the raw strings for filtering
  const handleTeamsGenerated = (teamsData, divisionKey, leagueName, divisionName) => {
    // Strip any season-label suffix (e.g. "_unassigned (2024-2025)" → "_unassigned")
    // so that re-generating for the same league/division always replaces the previous
    // result rather than accumulating a new entry.
    const cleanDivName = divisionName.replace(/\s*\([^)]+\)$/, '').trim()
    setAllTeams(prev => ({
      ...prev,
      [leagueName]: {
        ...(prev[leagueName] || {}),
        [cleanDivName]: teamsData
      }
    }))
    // Persist to DB so teams survive a page refresh
    fetch('/api/draft-teams', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ leagueName, divisionName: cleanDivName, teamMap: teamsData }),
    }).then(r => { if (!r.ok) r.json().then(d => console.error('[draft-teams save failed]', d)) })
      .catch(err => console.error('[draft-teams save error]', err))
  }

  // Delete all teams for a specific division within a league (dismiss or re-generate)
  const handleDeleteDivision = (leagueName, divisionName) => {
    // Remove from DB
    fetch(`/api/draft-teams?leagueName=${encodeURIComponent(leagueName)}&divisionName=${encodeURIComponent(divisionName)}`, {
      method: 'DELETE',
    }).catch(() => {})
    // Remove from React state
    setAllTeams(prev => {
      const updatedLeague = { ...(prev[leagueName] || {}) }
      delete updatedLeague[divisionName]
      if (Object.keys(updatedLeague).length === 0) {
        const updated = { ...prev }
        delete updated[leagueName]
        return updated
      }
      return { ...prev, [leagueName]: updatedLeague }
    })
  }

  // Update a specific team within a league > division
  const handleUpdateTeams = (leagueName, divisionName, teamKey, players, teamName, avg) => {
    setAllTeams(prev => {
      const updatedTeam = {
        ...(prev[leagueName]?.[divisionName]?.[teamKey] || {}),
        players,
        teamName,
        avg_experience: avg ?? prev[leagueName]?.[divisionName]?.[teamKey]?.avg_experience,
      }
      const updatedDiv = { ...(prev[leagueName]?.[divisionName] || {}), [teamKey]: updatedTeam }
      fetch('/api/draft-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueName, divisionName, teamMap: updatedDiv }),
      }).catch(() => {})
      return { ...prev, [leagueName]: { ...(prev[leagueName] || {}), [divisionName]: updatedDiv } }
    })
  }

  // Move a single team from one division to another within the same league
  const handleMoveTeam = (leagueName, fromDivision, toDivision, teamKey, teamData) => {
    setAllTeams(prev => {
      const league    = { ...(prev[leagueName] || {}) }
      const fromDiv   = { ...(league[fromDivision] || {}) }
      delete fromDiv[teamKey]
      const toDiv     = { ...(league[toDivision] || {}), [teamKey]: teamData }
      const updated   = { ...league, [fromDivision]: fromDiv, [toDivision]: toDiv }
      if (Object.keys(updated[fromDivision] || {}).length === 0) delete updated[fromDivision]

      // Persist the updated destination division to DraftTeam
      fetch('/api/draft-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueName, divisionName: toDivision, teamMap: toDiv }),
      }).catch(() => {})

      // If fromDiv is now empty, remove it from DraftTeam; otherwise persist its new state
      if (Object.keys(fromDiv).length === 0) {
        fetch(`/api/draft-teams?leagueName=${encodeURIComponent(leagueName)}&divisionName=${encodeURIComponent(fromDivision)}`, {
          method: 'DELETE',
        }).catch(() => {})
      } else {
        fetch('/api/draft-teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leagueName, divisionName: fromDivision, teamMap: fromDiv }),
        }).catch(() => {})
      }

      return { ...prev, [leagueName]: updated }
    })
  }

  // Delete a single draft team from a league > division
  const handleDeleteTeam = (leagueName, divisionName, teamKey) => {
    fetch(`/api/draft-teams?leagueName=${encodeURIComponent(leagueName)}&divisionName=${encodeURIComponent(divisionName)}&teamKey=${encodeURIComponent(teamKey)}`, {
      method: 'DELETE',
    }).catch(() => {})
    setAllTeams(prev => {
      const updatedDiv = { ...(prev[leagueName]?.[divisionName] || {}) }
      delete updatedDiv[teamKey]
      if (Object.keys(updatedDiv).length === 0) {
        const updatedLeague = { ...(prev[leagueName] || {}) }
        delete updatedLeague[divisionName]
        if (Object.keys(updatedLeague).length === 0) {
          const updated = { ...prev }
          delete updated[leagueName]
          return updated
        }
        return { ...prev, [leagueName]: updatedLeague }
      }
      return { ...prev, [leagueName]: { ...(prev[leagueName] || {}), [divisionName]: updatedDiv } }
    })
  }

  // Add a manually created team to a league > division
  const handleAddTeam = (leagueName, divisionName, teamKey, teamData) => {
    setAllTeams(prev => {
      const updatedDiv = { ...(prev[leagueName]?.[divisionName] || {}), [teamKey]: teamData }
      fetch('/api/draft-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueName, divisionName, teamMap: updatedDiv }),
      }).catch(() => {})
      return { ...prev, [leagueName]: { ...(prev[leagueName] || {}), [divisionName]: updatedDiv } }
    })
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/schedule" element={<LeagueCalendarPage />} />
          <Route path="/team/:teamID" element={<TeamPage />} />
          <Route path="/login" element={<Login />} />

          {/* Protected admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard
                  allTeams={allTeams}
                  teamsLoaded={teamsLoaded}
                  onDeleteDivision={handleDeleteDivision}
                  onDeleteTeam={handleDeleteTeam}
                  onUpdateTeams={handleUpdateTeams}
                  onAddTeam={handleAddTeam}
                  onMoveTeam={handleMoveTeam}
                />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/upload" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Upload onTeamsGenerated={handleTeamsGenerated} />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/generate-teams" element={
            <ProtectedRoute>
              <DashboardLayout>
                <GenerateTeams onTeamsGenerated={handleTeamsGenerated} />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/scraper" element={
            <ProtectedRoute><DashboardLayout><WebScraper /></DashboardLayout></ProtectedRoute>
          } />

          <Route path="/admin/schedule" element={
            <ProtectedRoute><DashboardLayout><ScheduleManager allTeams={allTeams} onDeleteDivision={handleDeleteDivision} /></DashboardLayout></ProtectedRoute>
          } />

          <Route path="/admin/settings" element={
            <ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
