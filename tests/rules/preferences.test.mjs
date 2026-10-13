import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  connectFirestoreEmulator,
  getFirestore,
  terminate,
  doc,
  getDocFromServer,
  getDocsFromServer,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  setLogLevel,
} from 'firebase/firestore'
import { settingsService } from '../../src/features/settings/services/settings.service.ts'
import { getDefaultUserPreferences } from '../../src/features/settings/config/defaultPreferences.ts'

assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(localhost|127\.0\.0\.1):\d+$/)
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
const uid = `preferences-${randomUUID()}`,
  otherUid = `other-${randomUUID()}`
const apps = []
setLogLevel('silent')
function client(user, name) {
  const app = initializeApp(
    { projectId: 'demo-devtrack', apiKey: 'demo-key', appId: 'demo-app' },
    name,
  )
  apps.push(app)
  const db = getFirestore(app)
  connectFirestoreEmulator(db, host, Number(port), user ? { mockUserToken: { sub: user } } : {})
  return db
}
const owner = client(uid),
  other = client(otherUid, 'other'),
  guest = client(null, 'guest')
const ref = (db, user = uid, id = 'preferences') => doc(db, 'users', user, 'settings', id)
const denied = (task) => assert.rejects(task, { code: 'permission-denied' })
const payload = (patch = {}) => ({
  ...getDefaultUserPreferences(),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...patch,
})
after(async () => {
  await Promise.all(
    apps.map(async (app) => {
      await terminate(getFirestore(app))
      await deleteApp(app)
    }),
  )
})

test('production settings service initializes once, persists, preserves audit fields and publishes realtime values', async () => {
  let latest
  let failure
  const unsubscribe = settingsService.subscribeToUserPreferences(
    uid,
    (data) => {
      latest = data
    },
    (cause) => {
      failure = cause
    },
  )
  try {
    const bootstrapDeadline = Date.now() + 10000
    while (latest !== null) {
      if (failure) throw failure
      assert.ok(Date.now() < bootstrapDeadline, 'Server-confirmed missing snapshot did not arrive')
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    assert.equal(await settingsService.getUserPreferences(uid), null)
    await Promise.all([
      settingsService.createDefaultUserPreferences(uid),
      settingsService.createDefaultUserPreferences(uid),
    ])
    assert.deepEqual(await settingsService.getUserPreferences(uid), getDefaultUserPreferences())
    const created = (await getDocFromServer(ref(owner))).data().createdAt
    const values = {
      ...getDefaultUserPreferences(),
      dayStartTime: '08:30',
      dayEndTime: '17:30',
      timeFormat: '12h',
      enabledActivityTypes: ['development', 'break'],
    }
    await settingsService.updateUserPreferences(uid, values)
    await settingsService.createDefaultUserPreferences(uid)
    const document = (await getDocFromServer(ref(owner))).data()
    assert.ok(document.createdAt.isEqual(created))
    assert.ok(document.updatedAt.toMillis() >= created.toMillis())
    assert.deepEqual(await settingsService.getUserPreferences(uid), values)
    const deadline = Date.now() + 10000
    while (latest?.dayStartTime !== '08:30') {
      if (failure) throw failure
      assert.ok(Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    assert.deepEqual(latest, values)
    assert.equal(Object.keys(document).length, 6)
    await assert.rejects(
      settingsService.updateUserPreferences(uid, { ...values, enabledActivityTypes: [] }),
    )
    await setDoc(ref(other, otherUid), payload({ dayStartTime: '10:00' }))
    assert.equal((await getDocFromServer(ref(other, otherUid))).data().dayStartTime, '10:00')
    await denied(() => settingsService.getUserPreferences(otherUid))
    await denied(() => settingsService.updateUserPreferences(otherUid, values))
  } finally {
    unsubscribe()
  }
})

test('guest/cross-user preferences reads and writes are denied; only the fixed owner document is available', async () => {
  assert.ok((await getDocFromServer(ref(owner))).exists())
  for (const db of [other, guest]) {
    await denied(() => getDocFromServer(ref(db)))
    await denied(() => setDoc(ref(db), payload()))
    await denied(() => updateDoc(ref(db), { dayStartTime: '08:00', updatedAt: serverTimestamp() }))
    await denied(() => deleteDoc(ref(db)))
  }
  await denied(() => getDocsFromServer(collection(owner, 'users', uid, 'settings')))
  await denied(() => setDoc(ref(owner, uid, 'random'), payload()))
  await denied(() => getDocFromServer(ref(owner, uid, 'random')))
  await denied(() => deleteDoc(ref(owner)))
})

test('preferences rules reject malformed fields, zero/unknown/duplicate types and forged audit changes', async (t) => {
  const createdAt = (await getDocFromServer(ref(owner))).data().createdAt
  for (const [label, patch] of [
    ['invalid start', { dayStartTime: '9:00' }],
    ['invalid end', { dayEndTime: '24:00' }],
    ['equal times', { dayEndTime: '09:00' }],
    ['overnight', { dayStartTime: '18:00', dayEndTime: '09:00' }],
    ['unknown format', { timeFormat: '12' }],
    ['empty types', { enabledActivityTypes: [] }],
    ['unknown type', { enabledActivityTypes: ['invented'] }],
    ['duplicate type', { enabledActivityTypes: ['break', 'break'] }],
    ['unexpected field', { totalMinutes: 540 }],
    ['forged update', { updatedAt: Timestamp.fromMillis(0) }],
  ])
    await t.test(label, () => denied(() => setDoc(ref(owner), { ...payload(patch), createdAt })))
  await t.test('forged creation update', () =>
    denied(() =>
      updateDoc(ref(owner), { createdAt: Timestamp.fromMillis(0), updatedAt: serverTimestamp() }),
    ),
  )
  const missing = payload()
  missing.createdAt = createdAt
  delete missing.dayEndTime
  await t.test('missing required field', () => denied(() => setDoc(ref(owner), missing)))
})

test('legacy partial preferences fill runtime defaults and save a complete audited document', async () => {
  // Trusted seed is restricted to the asserted loopback demo emulator, never a live project.
  const response = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-devtrack/databases/(default)/documents/users/${uid}/settings/preferences`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { dayStartTime: { stringValue: '08:00' } } }),
    },
  )
  assert.equal(response.status, 200)
  const mapped = await settingsService.getUserPreferences(uid)
  assert.deepEqual(mapped, { ...getDefaultUserPreferences(), dayStartTime: '08:00' })
  await settingsService.createDefaultUserPreferences(uid)
  assert.equal(Object.keys((await getDocFromServer(ref(owner))).data()).length, 1)
  await settingsService.updateUserPreferences(uid, mapped)
  const data = (await getDocFromServer(ref(owner))).data()
  assert.equal(Object.keys(data).length, 6)
  assert.ok(data.createdAt instanceof Timestamp)
})
