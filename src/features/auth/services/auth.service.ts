import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { getFirebaseAuth } from '../../../firebase/auth'
import type { AuthService } from '../types/auth.types'
import { mapFirebaseUser } from '../utils/userMapper'

function getAuth() {
  try {
    return getFirebaseAuth()
  } catch {
    // Keep detailed env validation in config.ts without exposing config to users.
    throw Object.assign(new Error('Firebase setup is incomplete.'), {
      code: 'app/firebase-not-configured',
    })
  }
}

export const authService: AuthService = {
  subscribeToAuthState(onUser, onError) {
    try {
      // getAuth uses Firebase's persistent browser storage; no manual token storage.
      return onAuthStateChanged(
        getAuth(),
        (user) => onUser(user ? mapFirebaseUser(user) : null),
        onError,
      )
    } catch (error) {
      let active = true
      queueMicrotask(() => {
        if (active) onError(error)
      })
      return () => {
        active = false
      }
    }
  },
  async signInWithGoogle() {
    if (!navigator.onLine) throw Object.assign(new Error('Offline'), { code: 'app/offline' })
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const credential = await signInWithPopup(getAuth(), provider)
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      // Profile outages must not keep an authenticated user on the login page indefinitely.
      await Promise.race([
        import('./userProfile.service').then(({ syncUserProfile }) =>
          syncUserProfile(mapFirebaseUser(credential.user)),
        ),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Profile sync timed out')), 8000)
        }),
      ])
      return { profileSyncFailed: false }
    } catch {
      // No credential/token objects are logged. The calling UI shows a non-blocking warning.
      if (import.meta.env.DEV)
        console.info('DevTrack profile sync failed; authenticated session retained.')
      return { profileSyncFailed: true }
    } finally {
      clearTimeout(timer)
    }
  },
  async signOutUser() {
    await signOut(getAuth())
  },
}
