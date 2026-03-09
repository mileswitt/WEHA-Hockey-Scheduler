export default function Navbar() {
  return (
    <nav className="bg-[#c21537] text-white px-10 py-4 flex justify-between items-center shadow-md">

      <h1 className="font-semibold">
        West Elk Hockey Association
      </h1>

      <div className="flex items-center gap-6">
        <button className="hover:text-red-500 transition">
          Contact
        </button>

        <button className="bg-gray-200 text-black px-4 py-1 rounded-md text-sm">
          Admin Login
        </button>
      </div>

    </nav>
  );
}