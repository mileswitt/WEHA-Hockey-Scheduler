// Public schedule page — the "/schedule" route.
// A thin wrapper that places the full-screen LeagueCalendar component between
// the shared nav and footer. All filter and calendar logic lives inside LeagueCalendar.
import PublicNavbar from '../components/PublicNavbar'
import LeagueCalendar from '../components/LeagueCalendar'
import PublicFooter from '../components/PublicFooter'

export default function LeagueCalendarPage() {
  return (
    <div style={{ backgroundColor: '#0f2b46' }} className="min-h-screen w-full flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex flex-col items-center w-full">
        <LeagueCalendar />
      </div>
      <PublicFooter />
    </div>
  )
}
