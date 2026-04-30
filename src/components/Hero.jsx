// src/components/Hero.jsx
// Hero section with Team Information dropdown organized by league
// Uses local DB routes instead of external API

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../assets/WEHAlogo.jpg";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Hero() {
  const navigate = useNavigate();

  const [teamOpen,      setTeamOpen]      = useState(false);
  const [gameOpen,      setGameOpen]      = useState(false);
  const [teamsByLeague, setTeamsByLeague] = useState({});
  const [loading,       setLoading]       = useState(false);

  // Fetch teams from local DB on mount — already grouped with league/division names
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/localteams`)
      .then(r => r.json())
      .then(teams => {
        // Group by LeagueName — already joined in the query
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

  return (
    <section className="relative w-full h-[550px] flex items-center justify-center text-white">

      <img
        src={Logo}
        alt="West Elk"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-[#0f2b46]/80"></div>

      <div className="relative z-10 text-center">
        <h1 className="text-6xl font-extrabold tracking-widest mb-6">
          WEST ELK
        </h1>
        <p className="text-lg text-gray-300 mb-8">
          Hockey Association
        </p>

        <div className="bg-[#a11c0b] inline-flex rounded px-16 py-4 gap-4 text-lg font-semibold">

          {/* Team Information dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setTeamOpen(true)}
            onMouseLeave={() => setTimeout(() => setTeamOpen(false), 100)}
          >
            <button className="hover:text-red-300 transition text-white">
              Team information ▾
            </button>

            {teamOpen && (
              <div
                onMouseEnter={() => setTeamOpen(true)}
                onMouseLeave={() => setTeamOpen(false)}
                style={{
                  position:            'absolute',
                  top:                 '100%',
                  left:                '50%',
                  transform:           'translateX(-50%)',
                  background:          '#fff',
                  borderRadius:        '14px',
                  boxShadow:           '0 20px 60px rgba(0,0,0,0.25)',
                  padding:             '20px',
                  minWidth:            '620px',
                  maxWidth:            '90vw',
                  maxHeight:           '65vh',
                  overflowY:           'auto',
                  display:             'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap:                 '20px',
                  zIndex:              999,
                  textAlign:           'left',
                  marginTop:           '0px',
                }}
              >
                {loading ? (
                  <p style={{ color: '#666', fontSize: 13, gridColumn: '1/-1' }}>
                    Loading teams...
                  </p>
                ) : (
                  Object.entries(teamsByLeague).sort().map(([league, teams]) => (
                    <div key={league}>
                      {/* League header */}
                      <div style={{
                        fontSize:      '11px',
                        fontWeight:    '800',
                        color:         '#c21537',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom:  '8px',
                        paddingBottom: '4px',
                        borderBottom:  '2px solid #c21537',
                      }}>
                        {league}
                      </div>

                      {/* Teams list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {teams
                          .sort((a, b) => a.Name.localeCompare(b.Name))
                          .map(team => (
                            <button
                              key={team.TeamID}
                              onClick={() => {
                                navigate(`/team/${team.TeamID}`);
                                setTeamOpen(false);
                              }}
                              style={{
                                background:   'none',
                                border:       'none',
                                textAlign:    'left',
                                padding:      '4px 6px',
                                borderRadius: '4px',
                                fontSize:     '13px',
                                color:        '#1f2937',
                                cursor:       'pointer',
                                fontWeight:   '500',
                                transition:   'background 0.1s',
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

          {/* Game Schedule */}
          <div
            className="relative"
            onMouseEnter={() => setGameOpen(true)}
            onMouseLeave={() => setGameOpen(false)}
          >
            <Link to="/schedule" className="hover:text-red-300 transition text-white">
              Game Schedule
            </Link>
            {gameOpen && (
              <div className="absolute top-full left-0 bg-white text-black rounded-xl shadow-xl p-4 w-48 z-50">
                <ul className="space-y-2 text-sm">
                  <li className="py-1">
                    <Link to="/schedule" className="hover:text-red-600 block">
                      League Calendar
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
