import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/Authentication'

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="w-64 min-h-screen bg-[#0B1F3A] border-r border-gray-700 p-4 flex flex-col justify-between">
      
      {/* Top — logo and nav */}
      <div>
        <h1 className="text-xl font-bold text-red-600 mb-6">WEHA Admin</h1>
        <nav className="flex flex-col gap-4">
          <Link to="/" className="text-gray-300 hover:text-white transition">Dashboard</Link>
          <Link to="/upload" className="text-gray-300 hover:text-white transition">Upload</Link>
          <Link to="/flagged" className="text-gray-300 hover:text-white transition">Flagged</Link>
          <Link to="/settings" className="text-gray-300 hover:text-white transition">Settings</Link>
        </nav>
      </div>

      {/* Bottom — logout button */}
      <div>
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full text-left text-gray-400 hover:text-red-400 transition text-sm"
        >
          ← Logout
        </button>
      </div>

      {/* Confirm Logout Popup */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-80 shadow-xl border border-gray-700">
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
        </div>
      )}
    </div>
  )
}