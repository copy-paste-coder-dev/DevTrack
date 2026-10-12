import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { authService } from '#auth-service'
import { AuthContext } from './AuthContext'
import type { AuthUser, SignInResult } from '../types/auth.types'
import { getAuthErrorMessage } from '../utils/authError'

interface SessionState {
  user: AuthUser | null
  isInitializing: boolean
  initializationError: string | null
}
const initialSession: SessionState = { user: null, isInitializing: true, initializationError: null }

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionState>(initialSession)
  const [attempt, setAttempt] = useState(0)
  const [isSigningIn, setSigningIn] = useState(false)
  const [isSigningOut, setSigningOut] = useState(false)
  const signInTask = useRef<Promise<SignInResult> | null>(null)
  const signOutTask = useRef<Promise<void> | null>(null)

  useEffect(() => {
    let active = true
    const unsubscribe = authService.subscribeToAuthState(
      (user) => {
        if (active) setSession({ user, isInitializing: false, initializationError: null })
      },
      (error) => {
        if (active)
          setSession({
            user: null,
            isInitializing: false,
            initializationError: getAuthErrorMessage(error, 'restore'),
          })
      },
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [attempt])

  function signInWithGoogle(): Promise<SignInResult> {
    if (signInTask.current) return signInTask.current
    setSigningIn(true)
    const task = authService.signInWithGoogle().finally(() => {
      signInTask.current = null
      setSigningIn(false)
    })
    signInTask.current = task
    return task
  }
  function logout(): Promise<void> {
    if (signOutTask.current) return signOutTask.current
    setSigningOut(true)
    const task = authService.signOutUser().finally(() => {
      signOutTask.current = null
      setSigningOut(false)
    })
    signOutTask.current = task
    return task
  }
  return (
    <AuthContext.Provider
      value={{
        ...session,
        isAuthenticated: Boolean(session.user),
        isSigningIn,
        isSigningOut,
        signInWithGoogle,
        logout,
        retryInitialization: () => {
          setSession(initialSession)
          setAttempt((value) => value + 1)
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
