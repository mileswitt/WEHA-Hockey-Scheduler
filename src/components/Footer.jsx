import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="bg-[#081423] text-white py-12 mt-20">

      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">

        {/* Branding */}
        <div>
          <h3 className="font-bold mb-4">West Elk Hockey Association</h3>
          <p className="text-gray-400 text-sm">
            Building champions on and off the ice.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="font-bold mb-4">Navigation</h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li>
              <Link to="/" className="hover:text-white transition">
                Home
              </Link>
            </li>
            <li>
              <Link to="/schedule" className="hover:text-white transition">
                League Schedule
              </Link>
            </li>
            <li className="hover:text-white cursor-pointer transition">
              Teams
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-bold mb-4">Contact</h3>
          <p className="text-gray-400 text-sm">
            info@westelkhockey.com
          </p>
        </div>

      </div>

    </footer>
  )
}

export default Footer