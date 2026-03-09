import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import UpcomingEvents from "./components/UpcomingEvents";
import WeeklyCalendar from "./components/WeeklyCalendar";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="bg-[#0f2b46] min-h-screen">

      <Navbar />

      <Hero />

      <div className="max-w-6xl mx-auto px-6 py-20">
        <UpcomingEvents />
        <WeeklyCalendar />
      </div>

    </div>
  );
}