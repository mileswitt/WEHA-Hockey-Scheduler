import Navbar from '../components/Navbar'
import LeagueCalendar from '../components/LeagueCalendar'
import Footer from '../components/Footer'

export default function LeagueCalendarPage() {
  return (
    <div className="min-h-screen w-full bg-[#CC1010]">
      <Navbar />
      <LeagueCalendar />
      <Footer />
    </div>
  )
}
