import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Flagged from './pages/Flagged'
import Settings from './pages/Settings'
import Sidebar from './components/Sidebar'

export default function App() {
  const [allTeams, setAllTeams] = useState({})

  const handleTeamsGenerated = (teamsData, division) => {
    setAllTeams(prev => ({
      ...prev,
      [division]: teamsData
    }))
  }

  return (
    <BrowserRouter>
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Dashboard allTeams={allTeams} />} />
            <Route path="/upload" element={<Upload onTeamsGenerated={handleTeamsGenerated} />} />
            <Route path="/flagged" element={<Flagged />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}