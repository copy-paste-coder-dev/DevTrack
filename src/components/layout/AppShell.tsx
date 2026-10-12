import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNavigation } from './MobileNavigation'
import { TopHeader } from './TopHeader'

export function AppShell() {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar />
      <div className="workspace">
        <TopHeader />
        <Outlet />
        <footer className="workspace-footer">
          <span>Log. Focus. Build.</span>
          <span>Made for the work that matters.</span>
        </footer>
      </div>
      <MobileNavigation />
    </div>
  )
}
