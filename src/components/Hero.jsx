import { useState } from "react";
import Logo from "../assets/WEHAlogo.jpg";

export default function Hero() {
  const [teamOpen, setTeamOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);

  return (
    <section className="relative w-full h-[550px] flex items-center justify-center text-white">

      {/* Background */}
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

        {/* Navigation Pills */}
        <div className="bg-[#a11c0b] rounded-full px-8 py-3 flex gap-8 justify-center shadow-xl relative">

          {/* Team Schedule */}
          <div
            className="relative"
            onMouseEnter={() => setTeamOpen(true)}
            onMouseLeave={() => setTeamOpen(false)}
          >
            <button className="hover:text-red-500 transition">
              Team Schedule
            </button>

            {teamOpen && (
              <div className="absolute top-10 left-0 bg-white text-black rounded-xl shadow-xl p-4 w-44">
                <ul className="space-y-2">
                  <li className="hover:text-red-600 cursor-pointer">Varsity</li>
                  <li className="hover:text-red-600 cursor-pointer">JV</li>
                  <li className="hover:text-red-600 cursor-pointer">Youth</li>
                </ul>
              </div>
            )}
          </div>

          {/* Game Schedule */}
          <div
            className="relative"
            onMouseEnter={() => setGameOpen(true)}
            onMouseLeave={() => setGameOpen(false)}
          >
            <button className="hover:text-red-500 transition">
              Game Schedule
            </button>

            {gameOpen && (
              <div className="absolute top-10 left-0 bg-white text-black rounded-xl shadow-xl p-4 w-44">
                <ul className="space-y-2">
                  <li className="hover:text-red-600 cursor-pointer">Home Games</li>
                  <li className="hover:text-red-600 cursor-pointer">Away Games</li>
                  <li className="hover:text-red-600 cursor-pointer">Tournaments</li>
                </ul>
              </div>
            )}
          </div>

          {/* Locker (no dropdown) */}
          <button className="hover:text-red-500 transition">
            Locker Schedule
          </button>

        </div>

      </div>
    </section>
  );
}