// Public home page — the root "/" route.
// Assembles the full-page layout by composing public components in order:
// sticky nav → hero banner → upcoming games → weekly schedule → footer.
// No state lives here; each child component fetches its own data.
import PublicNavbar from '../components/PublicNavbar'
import Hero from '../components/Hero'
import UpcomingEvents from '../components/UpcomingEvents'
import WeeklyCalendar from '../components/WeeklyCalendar'
import PublicFooter from '../components/PublicFooter'

export default function HomePage() {
  return (
    <div style={{ backgroundColor: '#0f2b46', minHeight: '100vh', width: '100%' }} className="text-white">
      <PublicNavbar />
      <Hero />
      <UpcomingEvents />
      <WeeklyCalendar />
      <PublicFooter />
    </div>
  )
}
