import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNavigation } from './MobileNavigation'
import { TopHeader } from './TopHeader'
import { UserPreferencesProvider } from '../../features/settings/context/UserPreferencesProvider'
import { useUserPreferences } from '../../features/settings/hooks/useUserPreferences'
import { Button } from '../ui/Button'

function PreferencesWarning() {
  const { error, retry, isLoading } = useUserPreferences()
  return error ? (
    <div className="preferences-warning" role="status">
      <p>{error} Default workday settings are being used.</p>
      <Button variant="ghost" onClick={retry} disabled={isLoading}>
        Retry preferences
      </Button>
    </div>
  ) : null
}

export function AppShell() {
  return (
    <UserPreferencesProvider>
      <div className="app-shell">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Sidebar />
        <div className="workspace">
          <TopHeader />
          <PreferencesWarning />
          <Outlet />
          <footer className="workspace-footer">
            <span>Log. Focus. Build.</span>
            <span>Made for the work that matters.</span>
          </footer>
        </div>
        <MobileNavigation />
      </div>
    </UserPreferencesProvider>
  )
}
