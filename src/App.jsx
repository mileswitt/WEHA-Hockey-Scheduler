import { Routes, Route } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage'
import LeagueCalendarPage from './pages/LeagueCalendarPage'

function App() {
  return (
    <Routes>
      <Route path="/"         element={<HomePage />} />
      <Route path="/schedule" element={<LeagueCalendarPage />} />
    </Routes>
  )
}

export default App