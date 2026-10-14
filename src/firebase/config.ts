import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app'

export function readFirebaseConfig(env: Record<string, unknown>): FirebaseOptions {
  const keys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ] as const
  const missing = keys.filter((key) => {
    const value = env[key]
    return typeof value !== 'string' || !value.trim()
  })
  if (missing.length)
    throw new Error(
      `DevTrack Firebase configuration is incomplete. Set ${missing.join(', ')} in .env.local (see .env.example), then restart Vite.`,
    )
  return {
    apiKey: String(env.VITE_FIREBASE_API_KEY).trim(),
    authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN).trim(),
    projectId: String(env.VITE_FIREBASE_PROJECT_ID).trim(),
    storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET).trim(),
    messagingSenderId: String(env.VITE_FIREBASE_MESSAGING_SENDER_ID).trim(),
    appId: String(env.VITE_FIREBASE_APP_ID).trim(),
  }
}
// Lazy initialization keeps the UI preview usable without a Firebase project.
// Any Firebase service request validates all configuration before initialization.
export function getFirebaseApp(environment: Record<string, unknown> = import.meta.env) {
  return (
    getApps().find((app) => app.name === '[DEFAULT]') ??
    initializeApp(readFirebaseConfig(environment))
  )
}
