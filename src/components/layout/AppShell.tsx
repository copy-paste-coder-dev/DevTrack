import { CalendarDays, LayoutDashboard, Settings2, Code2, LogIn, FlaskConical } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Brand } from './Brand'

const navigation = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays, end: false },
  { to: '/app/settings', label: 'Settings', icon: Settings2, end: false },
]
export function AppShell() {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <NavLink to="/app" className="brand-link" aria-label="DevTrack home">
          <Brand />
        </NavLink>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <Code2 size={18} />
            <span>Built for your flow.</span>
          </div>
          <NavLink to="/login" className="login-preview-link">
            <LogIn size={16} />
            Open sign-in preview
          </NavLink>
          <div className="profile">
            <span className="avatar">SA</span>
            <div>
              <strong>Shajith Ali</strong>
              <span>Sample workspace</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="topbar-label">
            Personal workspace <span>/</span> DevTrack
          </span>
          <Brand />
          <NavLink to="/login" className="workspace-status">
            <FlaskConical size={13} />
            <span>
              UI preview <span className="preview-detail">· Changes are not saved</span>
            </span>
          </NavLink>
        </header>
        <Outlet />
        <footer className="workspace-footer">
          <span>Log. Focus. Build.</span>
          <span>Made for the work that matters.</span>
        </footer>
      </div>
    </div>
  )
}
