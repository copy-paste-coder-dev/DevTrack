import { createContext } from 'react'
import type { AuthUser, SignInResult } from '../types/auth.types'

export interface AuthContextValue {
  user: AuthUser | null
  isInitializing: boolean
  isAuthenticated: boolean
  isSigningIn: boolean
  isSigningOut: boolean
  initializationError: string | null
  retryInitialization: () => void
  signInWithGoogle: () => Promise<SignInResult>
  logout: () => Promise<void>
}
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
