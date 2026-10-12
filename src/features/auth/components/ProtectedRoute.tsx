import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthLoadingScreen } from './AuthLoadingScreen'
import { validateReturnTo } from '../utils/returnTo'

export function ProtectedRoute() {
  const { isInitializing, isAuthenticated } = useAuth()
  const location = useLocation()
  if (isInitializing) return <AuthLoadingScreen />
  if (!isAuthenticated) {
    const returnTo = validateReturnTo(location.pathname + location.search + location.hash)
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }
  return <Outlet />
}
