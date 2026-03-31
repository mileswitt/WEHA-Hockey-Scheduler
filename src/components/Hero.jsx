import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/WEHAlogo.jpg";

export default function Hero() {
  const [teamOpen, setTeamOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);

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
          Wolverines Hockey Association
        </p>

        <div className="bg-[#a11c0b] rounded-full px-8 py-3 inline-flex gap-8 justify-center shadow-xl">

          {/* Team Schedule dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setTeamOpen(true)}
            onMouseLeave={() => setTeamOpen(false)}
          >
            <button className="hover:text-red-300 transition text-white">
              Team Schedule
            </button>
            {teamOpen && (
              <div className="absolute top-10 left-0 bg-white text-black rounded-xl shadow-xl p-4 w-44 z-50">
                <ul className="space-y-2 text-sm">
                  <li className="hover:text-red-600 cursor-pointer py-1">Varsity</li>
                  <li className="hover:text-red-600 cursor-pointer py-1">JV</li>
                  <li className="hover:text-red-600 cursor-pointer py-1">Youth</li>
                </ul>
              </div>
            )}
          </div>

          {/* Game Schedule — routes to /schedule */}
          <div
            className="relative"
            onMouseEnter={() => setGameOpen(true)}
            onMouseLeave={() => setGameOpen(false)}
          >
            <Link to="/schedule" className="hover:text-red-300 transition text-white">
              Game Schedule
            </Link>
            {gameOpen && (
              <div className="absolute top-10 left-0 bg-white text-black rounded-xl shadow-xl p-4 w-48 z-50">
                <ul className="space-y-2 text-sm">
                  <li className="py-1">
                    <Link to="/schedule" className="hover:text-red-600 block">
                      League Calendar
                    </Link>
                  </li>
                  <li className="hover:text-red-600 cursor-pointer py-1">Home Games</li>
                  <li className="hover:text-red-600 cursor-pointer py-1">Away Games</li>
                  <li className="hover:text-red-600 cursor-pointer py-1">Tournaments</li>
                </ul>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}