// src/components/Navbar.jsx
// Mobile responsive navbar with hamburger menu

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location  = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Homepage',      to: '/'         },
    { label: 'Full Calendar', to: '/schedule' },
  ]

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .nav-desktop { display: flex !important; }
          .nav-mobile-btn { display: none !important; }
          .nav-mobile-menu { display: none !important; }
        }
      `}</style>

      <nav style={{ backgroundColor: '#c21537', position: 'relative', zIndex: 100 }}
        className="text-white px-6 py-6 flex justify-between items-center shadow-md w-full">

        {/* Left — Logo */}
        <Link to="/" style={{ fontWeight: 700, fontSize: 18, color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap' }}
          className="hover:opacity-80 transition">
          West Elk Hockey Association
        </Link>

        {/* Desktop nav */}
        <div className="nav-desktop items-center gap-3">
          {navLinks.map(({ label, to }) => {
            const isActive = location.pathname === to
            return (
              <Link key={to} to={to} style={{
                backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.25)',
                color:           isActive ? '#c21537' : '#ffffff',
                padding:         '20px 28px',
                borderRadius:    '9999px',
                fontSize:        '15px',
                fontWeight:      '600',
                textDecoration:  'none',
                whiteSpace:      'nowrap',
                transition:      'all 0.15s',
                border:          isActive ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.4)',
              }}>
                {label}
              </Link>
            )
          })}
        </div>

        {/* Desktop right side */}
        <div className="nav-desktop items-center gap-6">
          <button className="text-sm whitespace-nowrap hover:opacity-80 transition">Contact</button>
          <button style={{ backgroundColor: '#f3f4f6', color: '#000', borderRadius: '6px' }}
            className="px-4 py-1 text-sm whitespace-nowrap hover:bg-white transition font-semibold">
            Admin Login
          </button>
        </div>

        {/* Hamburger button — mobile only */}
        <button
          className="nav-mobile-btn"
          onClick={() => setMenuOpen(o => !o)}
          style={{
            background:    'none',
            border:        'none',
            color:         '#fff',
            cursor:        'pointer',
            flexDirection: 'column',
            gap:           '5px',
            padding:       '4px',
          }}
        >
          <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2,
            transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2,
            opacity: menuOpen ? 0 : 1, transition: 'all 0.2s' }} />
          <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2,
            transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="nav-mobile-menu" style={{
          background:  '#a8101f',
          padding:     '16px 24px',
          display:     'flex',
          flexDirection:'column',
          gap:         '4px',
          zIndex:      99,
          position:    'relative',
        }}>
          {navLinks.map(({ label, to }) => (
            <Link key={to} to={to}
              onClick={() => setMenuOpen(false)}
              style={{
                color:          '#fff',
                textDecoration: 'none',
                padding:        '12px 0',
                fontSize:       16,
                fontWeight:     600,
                borderBottom:   '1px solid rgba(255,255,255,0.1)',
              }}>
              {label}
            </Link>
          ))}
          <button style={{ color: '#fff', background: 'none', border: 'none', textAlign: 'left',
            padding: '12px 0', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            Contact
          </button>
          <button style={{ marginTop: 8, backgroundColor: '#f3f4f6', color: '#000',
            borderRadius: 6, padding: '10px 16px', fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer', textAlign: 'center' }}>
            Admin Login
          </button>
        </div>
      )}
    </>
  )
}