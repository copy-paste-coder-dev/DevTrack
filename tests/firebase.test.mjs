import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deleteApp, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFirebaseApp, readFirebaseConfig } from '../src/firebase/config.ts'

test('missing configuration fails with actionable variable names before SDK initialization', () => {
  assert.throws(() => readFirebaseConfig({}), /VITE_FIREBASE_API_KEY.*\.env\.local/)
  assert.throws(() => readFirebaseConfig({ VITE_FIREBASE_API_KEY: '  ' }), /VITE_FIREBASE_API_KEY/)
})

test('syntactically valid configuration initializes a singleton with Auth and Firestore', async () => {
  // Deliberately synthetic: smoke-tests local SDK initialization, never backend access.
  const environment = {
    VITE_FIREBASE_API_KEY: 'synthetic-test-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'devtrack-test.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'devtrack-test',
    VITE_FIREBASE_STORAGE_BUCKET: 'devtrack-test.firebasestorage.app',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
    VITE_FIREBASE_APP_ID: '1:1234567890:web:synthetic',
  }
  assert.equal(
    readFirebaseConfig({ ...environment, VITE_FIREBASE_PROJECT_ID: ' devtrack-test \n' }).projectId,
    'devtrack-test',
  )
  const named = initializeApp({ projectId: 'named-test-project' }, 'unrelated-named-app')
  const app = getFirebaseApp(environment)
  assert.equal(getFirebaseApp(environment), app)
  assert.equal(getAuth(app).app, app)
  assert.equal(getFirestore(app).app, app)
  await deleteApp(app)
  await deleteApp(named)
})
