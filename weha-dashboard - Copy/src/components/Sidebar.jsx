// Admin sidebar — sticky on desktop, slide-in overlay on mobile.
//
// Layout strategy:
//   - Desktop (md+): position:sticky so it stays in the flex flow and takes up
//     its 256px column while content scrolls independently beside it.
//   - Mobile: position:fixed so it overlays the content without shifting layout.
//     It starts translated off-screen (-translate-x-full) and slides in when
//     isOpen is true. A semi-transparent backdrop rendered by DashboardLayout
//     lets the user tap outside to close it.
//
// Props:
//   isOpen  — controlled by DashboardLayout in App.jsx
//   onClose — called when a nav link is tapped or the X button is pressed
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/Authentication'

export default function Sidebar({ isOpen, onClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={`
      fixed md:sticky top-0 left-0 z-40 h-screen
      w-64 shrink-0 overflow-y-auto bg-[#0B1F3A] border-r border-gray-700 p-4 flex flex-col justify-between
      transition-transform duration-200
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>

      {/* Close button — only visible on mobile since desktop sidebar is always open */}
      <button
        className="md:hidden absolute top-3 right-3 text-gray-400 hover:text-white p-1 text-lg leading-none"
        onClick={onClose}
        aria-label="Close sidebar"
      >
        ✕
      </button>

      {/* Top section — logo and navigation links */}
      <div>
        <h1 className="text-xl font-bold text-red-600 mb-6 pr-8 md:pr-0">WEHA Admin</h1>
        <nav className="flex flex-col gap-4">
          {/* onClose is passed through so tapping a link collapses the mobile drawer */}
          <Link to="/admin" className="text-gray-300 hover:text-white transition" onClick={onClose}>Dashboard</Link>
          <Link to="/admin/upload" className="text-gray-300 hover:text-white transition" onClick={onClose}>Upload</Link>
          <Link to="/admin/generate-teams" className="text-gray-300 hover:text-white transition" onClick={onClose}>Generate Teams</Link>
          <Link to="/admin/schedule" className="text-gray-300 hover:text-white transition" onClick={onClose}>Schedule Manager</Link>
          <Link to="/admin/game-results" className="text-gray-300 hover:text-white transition" onClick={onClose}>Game Results</Link>
          <Link to="/admin/scraper" className="text-gray-300 hover:text-white transition" onClick={onClose}>Reseed Database</Link>

          <div className="border-t border-gray-700 my-1" />

          <Link
            to="/admin/season-reset"
            className="text-red-500 hover:text-red-400 transition font-medium"
            onClick={onClose}
          >
            Season Reset
          </Link>
        </nav>
      </div>

      {/* Bottom section — logout button pinned to the bottom of the sidebar */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full text-left text-gray-400 hover:text-red-400 transition text-sm"
        >
          Logout
        </button>
      </div>

      {/* Portal renders the modal on document.body so the sidebar's CSS transform
          doesn't become the containing block for position:fixed */}
      {showConfirm && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-gray-800 rounded-lg p-6 w-80 shadow-xl border border-gray-700 mx-4">
            <h2 className="text-white font-semibold text-lg mb-2">Confirm Logout</h2>
            <p className="text-gray-400 text-sm mb-6">Are you sure you want to log out?</p>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium transition"
              >
                Logout
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  )
}
