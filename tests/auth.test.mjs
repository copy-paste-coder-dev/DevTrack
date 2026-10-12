import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serverTimestamp } from 'firebase/firestore'
import { getAuthErrorMessage } from '../src/features/auth/utils/authError.ts'
import { validateReturnTo } from '../src/features/auth/utils/returnTo.ts'
import {
  getUserDisplayName,
  getUserInitials,
  mapFirebaseUser,
} from '../src/features/auth/utils/userMapper.ts'
import { buildProfileWrite } from '../src/features/auth/utils/profileWrite.ts'

test('return destinations allow only known internal app routes', () => {
  for (const path of ['/app', '/app/calendar?date=2026-10-13', '/app/settings#preferences'])
    assert.equal(validateReturnTo(path), path)
  for (const path of [
    null,
    '',
    'https://evil.example',
    '//evil.example/app',
    '/\\evil.example',
    '/login',
    '/app-other',
    '/app/%2e%2e/login',
    '/app\n',
    '\u0000/app',
    '/%2f%2fevil.example',
  ])
    assert.equal(validateReturnTo(path), '/app')
})

test('auth errors are friendly and never include raw credential details', () => {
  assert.equal(getAuthErrorMessage({ code: 'auth/popup-closed-by-user' }), 'Sign-in was cancelled.')
  assert.match(getAuthErrorMessage({ code: 'auth/popup-blocked' }), /allow popups/)
  assert.match(getAuthErrorMessage({ code: 'auth/network-request-failed' }), /connection/)
  assert.match(getAuthErrorMessage({ code: 'auth/unauthorized-domain' }), /not authorized/)
  assert.match(
    getAuthErrorMessage({ code: 'auth/account-exists-with-different-credential' }),
    /another sign-in method/,
  )
  assert.match(getAuthErrorMessage({ code: 'app/offline' }), /offline/)
  assert.equal(
    getAuthErrorMessage(new Error('secret raw details')),
    'Unable to sign in. Please try again.',
  )
  assert.equal(getAuthErrorMessage(null, 'sign-out'), 'Unable to sign out. Please try again.')
})

test('avatars resolve names and initials with safe fallbacks', () => {
  assert.equal(getUserInitials('Shajith Ali', null), 'SA')
  assert.equal(getUserInitials(' John ', null), 'J')
  assert.equal(getUserInitials(null, 'dev@example.com'), 'D')
  assert.equal(getUserInitials('   ', ''), 'U')
  assert.equal(getUserDisplayName(null), 'Developer')
})

test('Firebase user mapping exposes only the app user fields', () => {
  const mapped = mapFirebaseUser({
    uid: 'u1',
    displayName: null,
    email: 'dev@example.com',
    photoURL: null,
    accessToken: 'synthetic-not-a-real-token',
  })
  assert.deepEqual(mapped, {
    uid: 'u1',
    displayName: null,
    email: 'dev@example.com',
    photoURL: null,
  })
})

test('profile create uses server timestamps and update omits immutable fields', () => {
  const user = { uid: 'u1', displayName: 'First Name', email: 'dev@example.com', photoURL: null }
  const timestamp = serverTimestamp()
  const created = buildProfileWrite(user, timestamp, false)
  assert.deepEqual(created, {
    ...user,
    provider: 'google',
    createdAt: timestamp,
    updatedAt: timestamp,
    lastLoginAt: timestamp,
  })
  const updated = buildProfileWrite(
    { ...user, displayName: 'New Name', photoURL: 'https://example.invalid/photo.png' },
    timestamp,
    true,
  )
  assert.equal(updated.displayName, 'New Name')
  assert.equal(updated.photoURL, 'https://example.invalid/photo.png')
  for (const field of ['createdAt', 'uid', 'provider']) assert.equal(field in updated, false)
  assert.equal(updated.updatedAt, timestamp)
  assert.equal(updated.lastLoginAt, timestamp)
})
