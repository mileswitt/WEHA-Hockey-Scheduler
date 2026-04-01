import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/Authentication'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Flagged from './pages/Flagged'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'

// Shared layout wrapper for all protected dashboard pages
// Renders the sidebar + main content area side by side
function DashboardLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}

export default function App() {
  // Global teams state — structured as { division: { teamKey: teamData } }
  // e.g. { U10: { team1: { players: [], avg_experience: 2, size: 11 } } }
  const [allTeams, setAllTeams] = useState({})

  // Called from Upload page when the algorithm generates new teams
  // Merges new division data into existing state without overwriting other divisions
  const handleTeamsGenerated = (teamsData, division) => {
    setAllTeams(prev => ({ ...prev, [division]: teamsData }))
  }

  // Called from Dashboard when admin deletes all teams for a division
  // Removes the division key entirely from state
  const handleDeleteDivision = (division) => {
    setAllTeams(prev => {
      const updated = { ...prev }
      delete updated[division]
      return updated
    })
  }

  // Called from Dashboard when admin saves edits to a team
  // Updates a specific team within a division, preserving all other teams and divisions
  // avg is optional — if not provided, keeps the existing avg_experience value
  const handleUpdateTeams = (division, teamKey, players, teamName, avg) => {
    setAllTeams(prev => ({
      ...prev,
      [division]: {
        ...prev[division],
        [teamKey]: {
          ...prev[division][teamKey],
          players,
          teamName,
          avg_experience: avg ?? prev[division][teamKey].avg_experience
        }
      }
    }))
  }

  // Called from Dashboard when admin manually creates a new team
  // Adds the new team to the specified division, creating the division if it doesn't exist
  const handleAddTeam = (division, teamKey, teamData) => {
    setAllTeams(prev => ({
      ...prev,
      [division]: {
        ...(prev[division] || {}),
        [teamKey]: teamData
      }
    }))
  }

  return (
    // AuthProvider wraps everything so auth state is accessible anywhere via useAuth()
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route — login page has its own full-screen layout */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes — all wrapped in DashboardLayout with sidebar */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard
                  allTeams={allTeams}
                  onDeleteDivision={handleDeleteDivision}
                  onUpdateTeams={handleUpdateTeams}
                  onAddTeam={handleAddTeam}
                />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/upload" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Upload onTeamsGenerated={handleTeamsGenerated} />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/flagged" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Flagged />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Catch-all — any unknown route redirects to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}