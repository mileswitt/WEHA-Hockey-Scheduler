import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()

  const navLinks = [
    { label: 'homepage', to: '/'         },
    { label: 'full calendar', to: '/schedule' },
  ]

  return (
    <nav style={{ backgroundColor: '#c21537' }} className="text-white px-10 py-4 flex justify-between items-center shadow-md w-full">

      <Link to="/" className="font-semibold hover:opacity-80 transition whitespace-nowrap">
        West Elk Hockey Association
      </Link>

      {/* Center Nav Tabs */}
      <div className="flex items-center gap-3">
        {navLinks.map(({ label, to }) => {
          const isActive = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              style={{
                backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.25)',
                color: isActive ? '#c21537' : '#ffffff',
                padding: '6px 18px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                border: isActive ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.4)',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-6">
        <button className="text-sm whitespace-nowrap hover:opacity-80 transition">
          Contact
        </button>
        <button
          style={{ backgroundColor: '#f3f4f6', color: '#000', borderRadius: '6px' }}
          className="px-4 py-1 text-sm whitespace-nowrap hover:bg-white transition"
        >
          Admin Login
        </button>
      </div>

    </nav>
  )
}