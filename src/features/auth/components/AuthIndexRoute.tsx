import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthLoadingScreen } from './AuthLoadingScreen'

export function AuthIndexRoute() {
  const { isInitializing, isAuthenticated } = useAuth()
  if (isInitializing) return <AuthLoadingScreen />
  return <Navigate to={isAuthenticated ? '/app' : '/login'} replace />
}
