import { Link } from 'react-router-dom'

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-[#0B1F3A] border-r border-gray-700 p-4">
      <h1 className="text-xl font-bold text-red-600 mb-6">WEHA Admin</h1>

      <nav className="flex flex-col gap-4">
        <Link to="/">Dashboard</Link>
        <Link to="/upload">Upload</Link>
        <Link to="/flagged">Flagged</Link>
        <Link to="/settings">Settings</Link>
      </nav>
    </div>
  )
}