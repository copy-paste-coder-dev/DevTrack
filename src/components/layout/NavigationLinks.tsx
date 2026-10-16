import { CalendarDays, FileText, House, LayoutDashboard, Settings2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navigation = [
  { to: '/app', label: 'Dashboard', mobileLabel: 'Home', icon: LayoutDashboard, end: true },
  {
    to: '/app/calendar',
    label: 'Calendar',
    mobileLabel: 'Calendar',
    icon: CalendarDays,
    end: false,
  },
  { to: '/app/eod', label: 'EOD Summary', mobileLabel: 'Summary', icon: FileText, end: false },
  { to: '/app/settings', label: 'Settings', mobileLabel: 'Settings', icon: Settings2, end: false },
]
export function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
      {navigation.map(({ to, label, mobileLabel, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          {mobile && to === '/app' ? <House size={19} /> : <Icon size={19} />}
          <span>{mobile ? mobileLabel : label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
