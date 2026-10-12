import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'

export function readFirebaseConfig(env: Record<string, unknown>): FirebaseOptions {
  const keys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID'] as const
  const missing = keys.filter(key => typeof env[key] !== 'string' || !(env[key] as string).trim())
  if (missing.length) throw new Error(`DevTrack Firebase configuration is incomplete. Set ${missing.join(', ')} in .env.local (see .env.example), then restart Vite.`)
  return {
    apiKey: String(env.VITE_FIREBASE_API_KEY), authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: String(env.VITE_FIREBASE_PROJECT_ID), storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: String(env.VITE_FIREBASE_MESSAGING_SENDER_ID), appId: String(env.VITE_FIREBASE_APP_ID),
  }
}
// Lazy initialization keeps the UI preview usable without a Firebase project.
// Any Firebase service request validates all configuration before initialization.
export function getFirebaseApp(environment: Record<string, unknown> = import.meta.env) {
  return getApps().length ? getApp() : initializeApp(readFirebaseConfig(environment))
}
