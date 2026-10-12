const messages: Record<string, string> = {
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request':
    'Another sign-in attempt is already open. Please finish it first.',
  'auth/popup-blocked':
    'Your browser blocked the sign-in popup. Please allow popups and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/account-exists-with-different-credential':
    'An account already exists using this email with another sign-in method.',
  'auth/unauthorized-domain': 'This domain is not authorized for Firebase Authentication.',
  'auth/operation-not-allowed': 'Google sign-in is not enabled for this app yet.',
  'auth/invalid-api-key': 'Sign-in is unavailable because Firebase setup needs attention.',
  'auth/app-not-authorized': 'Sign-in is unavailable because Firebase setup needs attention.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'app/firebase-not-configured':
    'Sign-in is unavailable. Complete the Firebase setup and restart the app.',
  'app/offline': "You're offline. Connect to the internet and try signing in again.",
}

export function getAuthErrorMessage(
  error: unknown,
  operation: 'sign-in' | 'sign-out' | 'restore' = 'sign-in',
) {
  if (operation === 'sign-out') return 'Unable to sign out. Please try again.'
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  return (
    messages[code] ??
    (operation === 'restore'
      ? 'Unable to restore your session. Please try again.'
      : 'Unable to sign in. Please try again.')
  )
}
