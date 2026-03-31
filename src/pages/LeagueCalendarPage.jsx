import Navbar from '../components/Navbar'
import LeagueCalendar from '../components/LeagueCalendar'
import Footer from '../components/Footer'

export default function LeagueCalendarPage() {
  return (
    <div className="min-h-screen w-full bg-[#CC1010] flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center w-full">
        <LeagueCalendar />
      </div>
      <Footer />
    </div>
  )
}