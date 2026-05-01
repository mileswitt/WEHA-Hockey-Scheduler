// src/components/Hero.jsx
// Hero section with Team Information dropdown organized by league
// Uses local DB routes instead of external API
// Mobile responsive hero with tap-friendly dropdowns


import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../assets/WEHAlogo.jpg";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Hero() {
  const navigate = useNavigate();
  const dropRef  = useRef(null);

  const [teamOpen,      setTeamOpen]      = useState(false);
  const [teamsByLeague, setTeamsByLeague] = useState({});
  const [loading,       setLoading]       = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch teams grouped by league
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/localteams`)
      .then(r => r.json())
      .then(teams => {
        const grouped = {};
        teams.forEach(team => {
          const leagueName = team.LeagueName || "Other";
          if (!grouped[leagueName]) grouped[leagueName] = [];
          grouped[leagueName].push(team);
        });
        setTeamsByLeague(grouped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Close team dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setTeamOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, []);

  // Team dropdown — hover on desktop, tap on mobile
  const teamHandlers = isMobile
    ? { onClick: () => setTeamOpen(o => !o) }
    : {
        onMouseEnter: () => setTeamOpen(true),
        onMouseLeave: () => setTimeout(() => setTeamOpen(false), 100),
      };

  return (
    <section
      className="relative w-full flex items-center justify-center text-white"
      style={{ minHeight: isMobile ? '420px' : '550px' }}
    >
      <img src={Logo} alt="West Elk"
        className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[#0f2b46]/80" />

      <div className="relative z-10 text-center px-4 w-full">
        <h1
          style={{ fontSize: isMobile ? '2.5rem' : '3.75rem' }}
          className="font-extrabold tracking-widest mb-3"
        >
          WEST ELK
        </h1>
        <p className="text-gray-300 mb-6" style={{ fontSize: isMobile ? 14 : 18 }}>
          Hockey Association
        </p>

        {/* Action bar */}
        <div style={{
          background:     '#a11c0b',
          display:        'inline-flex',
          borderRadius:   8,
          padding:        isMobile ? '10px 16px' : '14px 32px',
          gap:            isMobile ? 8 : 16,
          flexWrap:       'wrap',
          justifyContent: 'center',
          fontSize:       isMobile ? 14 : 16,
          fontWeight:     600,
          position:       'relative',
        }}>

          {/* Team Information dropdown */}
          <div ref={dropRef} style={{ position: 'relative' }} {...teamHandlers}>
            <button style={{
              background:  'none',
              border:      'none',
              color:       '#fff',
              cursor:      'pointer',
              fontSize:    'inherit',
              fontWeight:  'inherit',
              padding:     '4px 8px',
              borderRadius: 4,
              whiteSpace:  'nowrap',
            }}>
              Team information ▾
            </button>

            {teamOpen && (
              <div
                onMouseEnter={!isMobile ? () => setTeamOpen(true)  : undefined}
                onMouseLeave={!isMobile ? () => setTeamOpen(false) : undefined}
                style={{
                  position:            'absolute',
                  top:                 '100%',
                  left:                isMobile ? '-60px' : '50%',
                  transform:           isMobile ? 'none' : 'translateX(-50%)',
                  background:          '#fff',
                  borderRadius:        12,
                  boxShadow:           '0 20px 60px rgba(0,0,0,0.25)',
                  padding:             16,
                  width:               isMobile ? '85vw' : 'auto',
                  minWidth:            isMobile ? 'auto' : '580px',
                  maxWidth:            '92vw',
                  maxHeight:           '60vh',
                  overflowY:           'auto',
                  display:             'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap:                 16,
                  zIndex:              999,
                  textAlign:           'left',
                }}
              >
                {loading ? (
                  <p style={{ color: '#666', fontSize: 13, gridColumn: '1/-1' }}>
                    Loading teams...
                  </p>
                ) : (
                  Object.entries(teamsByLeague).sort().map(([league, teams]) => (
                    <div key={league}>
                      <div style={{
                        fontSize:      10,
                        fontWeight:    800,
                        color:         '#c21537',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom:  6,
                        paddingBottom: 4,
                        borderBottom:  '2px solid #c21537',
                      }}>
                        {league}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {teams
                          .sort((a, b) => a.Name.localeCompare(b.Name))
                          .map(team => (
                            <button
                              key={team.TeamID}
                              onClick={() => { navigate(`/team/${team.TeamID}`); setTeamOpen(false); }}
                              style={{
                                background:   'none',
                                border:       'none',
                                textAlign:    'left',
                                padding:      '5px 6px',
                                borderRadius: 4,
                                fontSize:     isMobile ? 12 : 13,
                                color:        '#1f2937',
                                cursor:       'pointer',
                                fontWeight:   500,
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                              {team.Name}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Game Schedule — direct link, no dropdown */}
          <Link
            to="/schedule"
            style={{
              color:          '#fff',
              textDecoration: 'none',
              padding:        '4px 8px',
              borderRadius:   4,
              whiteSpace:     'nowrap',
              transition:     'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#93c5fd'}
            onMouseLeave={e => e.currentTarget.style.color = '#fff'}
          >
            Game Schedule
          </Link>

        </div>
      </div>
    </section>
  );
}
