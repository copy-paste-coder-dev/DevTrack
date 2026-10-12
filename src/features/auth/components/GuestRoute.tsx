import { Navigate, Outlet, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { validateReturnTo } from '../utils/returnTo'
import { AuthLoadingScreen } from './AuthLoadingScreen'

export function GuestRoute() {
  const { isInitializing, isAuthenticated, isSigningIn } = useAuth()
  const [params] = useSearchParams()
  if (isInitializing) return <AuthLoadingScreen />
  // Keep the sign-in button mounted until best-effort profile sync finishes.
  // This guard is the sole post-login navigation owner.
  if (isAuthenticated && !isSigningIn)
    return <Navigate to={validateReturnTo(params.get('returnTo'))} replace />
  return <Outlet />
}
