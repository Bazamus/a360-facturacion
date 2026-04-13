import { useNavigate, useLocation } from 'react-router-dom'
import { CalendarDays, ClipboardList, Ticket } from 'lucide-react'

const TABS = [
  { icon: CalendarDays, label: 'Mi Agenda', to: '/sat/mi-agenda', match: '/sat/mi-agenda' },
  { icon: ClipboardList, label: 'Todas', to: '/sat/intervenciones', match: '/sat/intervenciones' },
  { icon: Ticket, label: 'Tickets', to: '/sat/tickets', match: '/sat/tickets' },
]

export function TecnicoBottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', paddingTop: '8px' }}>
      {TABS.map(({ icon: Icon, label, to, match }) => {
        const active = pathname === match || (match !== '/sat/mi-agenda' && pathname.startsWith(match))
        return (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition-colors min-w-0 ${
              active ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
