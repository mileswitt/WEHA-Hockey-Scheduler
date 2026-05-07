// Public navigation bar — appears on every public-facing page.
// On desktop (md+) it shows the logo, nav pill links, and an admin login button
// side-by-side. On mobile it collapses to a hamburger icon that toggles a
// dropdown drawer with all the same links stacked vertically.
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function PublicNavbar() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  const navLinks = [
    { label: 'homepage',         to: '/'          },
    { label: 'teams',            to: '/teams'     },
    { label: 'league standings', to: '/standings' },
    { label: 'full calendar',    to: '/schedule'  },
  ]

  return (
    <nav style={{ backgroundColor: '#c21537' }} className="text-white shadow-md w-full">

      {/* Main bar */}
      <div className="px-5 md:px-10 py-4 flex justify-between items-center">

        <Link to="/" className="font-semibold hover:opacity-80 transition text-sm md:text-base whitespace-nowrap">
          West Elk Hockey Association
        </Link>

        {/* Desktop nav tabs — hidden on mobile */}
        <div className="hidden md:flex items-center gap-3">
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

        {/* Desktop right side — hidden on mobile */}
        <div className="hidden md:flex items-center gap-6">
          <button onClick={scrollToContact} className="text-sm whitespace-nowrap hover:opacity-80 transition">
            Contact
          </button>
          <Link
            to="/login"
            style={{ backgroundColor: '#f3f4f6', color: '#000', borderRadius: '6px' }}
            className="px-4 py-1 text-sm whitespace-nowrap hover:bg-white transition"
          >
            Admin Login
          </Link>
        </div>

        {/* Hamburger button — only visible on mobile.
            The three spans animate into an X when the menu is open. */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 rounded hover:bg-white/10 transition"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-white rounded transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white rounded transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white rounded transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile dropdown drawer — conditionally rendered when menuOpen is true.
          Clicking any link closes the menu via setMenuOpen(false). */}
      {menuOpen && (
        <div style={{ backgroundColor: '#a81030' }} className="md:hidden px-5 pb-5 flex flex-col gap-1 border-t border-white/20">
          {navLinks.map(({ label, to }) => {
            const isActive = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-sm font-semibold border-b border-white/10 last:border-0 capitalize"
                style={{ color: isActive ? '#ffd0d8' : '#ffffff' }}
              >
                {label}
              </Link>
            )
          })}
          <div className="pt-3 flex flex-col gap-2">
            <button onClick={scrollToContact} className="text-sm text-white/80 text-left py-1">Contact</button>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              style={{ backgroundColor: '#f3f4f6', color: '#000', borderRadius: '6px', textAlign: 'center' }}
              className="px-4 py-2 text-sm font-medium"
            >
              Admin Login
            </Link>
          </div>
        </div>
      )}

    </nav>
  )
}
