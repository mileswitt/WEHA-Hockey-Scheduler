const Footer = () => {
  return (
    <footer className="bg-[#081423] py-12 mt-20">

      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">

        <div>
          <h3 className="font-bold mb-4">West Elk Hockey Association</h3>
          <p className="text-gray-400 text-sm">
            Building champions on and off the ice.
          </p>
        </div>

        <div>
          <h3 className="font-bold mb-4">Navigation</h3>
          <ul className="space-y-2 text-gray-400">
            <li>Home</li>
            <li>Schedule</li>
            <li>Teams</li>
          </ul>
        </div>

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