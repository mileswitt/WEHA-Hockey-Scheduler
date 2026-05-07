// Hero banner — full-width section at the top of the home page.
// Displays the WEHA logo as a background image with a dark overlay, a title,
// and a button bar with two dropdowns:
//   - "Team Information": fetches all teams from the API, groups them by league,
//     and lets visitors jump directly to any team's roster page.
//   - "Game Schedule": links through to the league calendar.
//
// Dropdowns open on mouse-enter (desktop hover) AND on click (mobile tap).
// The team dropdown uses `width: min(620px, 92vw)` so it never overflows the
// viewport on small screens.
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../assets/WEHAlogo.jpg";

export default function Hero() {
  const navigate = useNavigate();

  const [teamOpen,      setTeamOpen]      = useState(false);
  const [gameOpen,      setGameOpen]      = useState(false);
  const [teamsByLeague, setTeamsByLeague] = useState({});
  const [loading,       setLoading]       = useState(false);

  // Fetch all local teams on mount and group them by league name so the
  // dropdown can render one column per league.
  useEffect(() => {
    setLoading(true);
    fetch("/api/localteams")
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

  return (
    <section className="relative w-full h-[320px] sm:h-[420px] md:h-[550px] flex items-center justify-center text-white">

      {/* Background logo image with a dark-blue overlay for readability */}
      <img
        src={Logo}
        alt="West Elk"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-[#0f2b46]/80"></div>

      {/* Centered content — sits above the overlay via z-10 */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-widest mb-3 md:mb-6">
          WEST ELK
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-300 mb-5 md:mb-8">
          Wolverines Hockey Association
        </p>

        {/* Button bar — stacks vertically on mobile, side-by-side on sm+ */}
        <div className="bg-[#a11c0b] inline-flex flex-col sm:flex-row rounded px-5 sm:px-10 md:px-16 py-3 md:py-4 gap-3 sm:gap-4 text-sm sm:text-base md:text-lg font-semibold">

          {/* ── Team Information dropdown ─────────────────────────────────────
              Opens on hover (desktop) or click (mobile). The dropdown itself
              also re-triggers onMouseEnter so moving the cursor into it doesn't
              close the panel mid-navigation. */}
          <div
            className="relative"
            onMouseEnter={() => setTeamOpen(true)}
            onMouseLeave={() => setTimeout(() => setTeamOpen(false), 100)}
          >
            <button
              className="hover:text-red-300 transition text-white w-full sm:w-auto"
              onClick={() => setTeamOpen(o => !o)}
            >
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
                  // min(620px, 92vw) prevents the panel from overflowing on narrow screens
                  width:               'min(620px, 92vw)',
                  maxHeight:           '65vh',
                  overflowY:           'auto',
                  display:             'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap:                 '16px',
                  zIndex:              999,
                  textAlign:           'left',
                  marginTop:           '0px',
                }}
              >
                {loading ? (
                  <p style={{ color: '#666', fontSize: 13, gridColumn: '1/-1' }}>
                    Loading teams...
                  </p>
                ) : Object.keys(teamsByLeague).length === 0 ? (
                  <p style={{ color: '#666', fontSize: 13, gridColumn: '1/-1' }}>
                    No teams found. Save teams in the admin panel first.
                  </p>
                ) : (
                  // Each league gets its own column with a red section header
                  Object.entries(teamsByLeague).sort().map(([league, teams]) => (
                    <div key={league}>
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

          {/* ── Game Schedule dropdown ────────────────────────────────────────
              Simpler than the team dropdown — just a quick link to the calendar. */}
          <div
            className="relative"
            onMouseEnter={() => setGameOpen(true)}
            onMouseLeave={() => setGameOpen(false)}
          >
            <Link
              to="/schedule"
              className="hover:text-red-300 transition text-white"
              onClick={() => setGameOpen(false)}
            >
              Game Schedule
            </Link>
            {gameOpen && (
              <div className="absolute top-full left-0 bg-white text-black rounded-xl shadow-xl p-4 w-44 z-50">
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
