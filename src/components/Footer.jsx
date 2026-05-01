// src/components/Footer.jsx
// Mobile responsive footer

import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="bg-[#081423] text-white py-10 mt-20">
      <div className="max-w-6xl mx-auto px-6">

        {/* Grid — stacks on mobile */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap:                 32,
          marginBottom:        32,
        }}>
          {/* Branding */}
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>
              West Elk Hockey Association
            </h3>
            <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6 }}>
              Building champions on and off the ice.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Navigation</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>
                <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 13 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/schedule" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 13 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
                  League Schedule
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Contact</h3>
            <p style={{ color: '#9ca3af', fontSize: 13 }}>info@westelkhockey.com</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop:  '1px solid rgba(255,255,255,0.1)',
          paddingTop: 16,
          display:    'flex',
          justifyContent: 'space-between',
          flexWrap:   'wrap',
          gap:        8,
        }}>
          <p style={{ color: '#6b7280', fontSize: 12 }}>
            © {new Date().getFullYear()} West Elk Hockey Association
          </p>
          <p style={{ color: '#6b7280', fontSize: 12 }}>
            Western Colorado Hockey League
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
