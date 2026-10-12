import { CalendarDays, LayoutDashboard, Settings2, Code2 } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Brand } from './Brand'

const navigation = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays, end: false },
  { to: '/app/settings', label: 'Settings', icon: Settings2, end: false },
]
export function AppShell() {
  return <div className="app-shell"><a href="#main-content" className="skip-link">Skip to content</a><aside className="sidebar"><NavLink to="/app" className="brand-link" aria-label="DevTrack home"><Brand /></NavLink><p className="nav-label">WORKSPACE</p><nav aria-label="Main navigation">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}</nav><div className="sidebar-bottom"><div className="workspace-note"><Code2 size={18} /><span>Built for your flow.</span></div><div className="profile"><span className="avatar">SA</span><div><strong>Shajith Ali</strong><span>Personal workspace</span></div><span className="online-dot" /></div></div></aside><div className="workspace"><header className="topbar"><span className="topbar-label">Personal workspace <span>/</span> DevTrack</span><Brand /><span className="workspace-status"><span className="online-dot" /> All systems ready</span></header><Outlet /><footer className="workspace-footer"><span>Log. Focus. Build.</span><span>Made for the work that matters.</span></footer></div></div>
}
