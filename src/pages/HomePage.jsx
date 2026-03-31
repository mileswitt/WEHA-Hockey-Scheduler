import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import UpcomingEvents from '../components/UpcomingEvents'
import WeeklyCalendar from '../components/WeeklyCalendar'
import Footer from '../components/Footer'

export default function HomePage() {
  return (
    <div style={{ backgroundColor: '#0f2b46', minHeight: '100vh', width: '100%' }} className="text-white">
      <Navbar />
      <Hero />
      <UpcomingEvents />
      <WeeklyCalendar />
      <Footer />
    </div>
  )
}
