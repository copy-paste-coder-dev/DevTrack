// Local Playwright adapter only. Vite refuses production builds in e2e mode.
// Synthetic identities are not Firebase credentials and never leave the test browser.
import type { AuthService, AuthUser } from '../../src/features/auth/types/auth.types'

const key = 'devtrack-e2e-session'
const fixture: AuthUser = {
  uid: 'test-developer',
  displayName: 'Test Developer',
  email: 'dev@example.invalid',
  photoURL: null,
}
const listeners = new Set<(user: AuthUser | null) => void>()
interface Options {
  initializationDelay?: number
  initializationError?: boolean
  signInDelay?: number
  signInError?: string
  profileSyncFailed?: boolean
  logoutError?: boolean
}
function options(): Options {
  return JSON.parse(localStorage.getItem('devtrack-e2e-options') ?? '{}') as Options
}
function current(): AuthUser | null {
  const stored = localStorage.getItem(key)
  return stored === null ? fixture : (JSON.parse(stored) as AuthUser | null)
}
function publish(user: AuthUser | null) {
  localStorage.setItem(key, JSON.stringify(user))
  for (const listener of listeners) listener(user)
}
export const authService: AuthService = {
  subscribeToAuthState(onUser, onError) {
    listeners.add(onUser)
    const timer = setTimeout(() => {
      if (options().initializationError) onError({ code: 'app/firebase-not-configured' })
      else onUser(current())
    }, options().initializationDelay ?? 0)
    return () => {
      clearTimeout(timer)
      listeners.delete(onUser)
    }
  },
  async signInWithGoogle() {
    if (!navigator.onLine) throw { code: 'app/offline' }
    await new Promise((resolve) => setTimeout(resolve, options().signInDelay ?? 80))
    if (options().signInError) throw { code: options().signInError }
    publish(fixture)
    // Deliberately emit auth before profile sync, reproducing the real SDK's ordering.
    await new Promise((resolve) => setTimeout(resolve, options().signInDelay ?? 80))
    return { profileSyncFailed: options().profileSyncFailed ?? false }
  },
  async signOutUser() {
    await new Promise((resolve) => setTimeout(resolve, 50))
    if (options().logoutError) throw new Error('Synthetic logout failure')
    publish(null)
  },
}
