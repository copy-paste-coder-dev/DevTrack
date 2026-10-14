import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  Timestamp,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  terminate,
  updateDoc,
  where,
} from 'firebase/firestore'

// Refuse to run against a remote database, even when real app config is present.
const host = process.env.FIRESTORE_EMULATOR_HOST
assert.match(
  host ?? '',
  /^(127\.0\.0\.1|localhost):\d+$/,
  'Start the local Firestore emulator first',
)
const [hostname, port] = host.split(':')
const projectId = 'demo-devtrack'
const runId = randomUUID()
const ownerId = `owner-${runId}`
const apps = []
setLogLevel('silent') // Permission failures below are expected assertions.

function client(uid) {
  const app = initializeApp({ projectId, apiKey: 'demo-key', appId: 'demo-app' }, randomUUID())
  apps.push(app)
  const db = getFirestore(app)
  connectFirestoreEmulator(db, hostname, Number(port), uid ? { mockUserToken: { sub: uid } } : {})
  return db
}

const owner = client(ownerId)
const other = client(`other-${runId}`)
const guest = client()
const activityRef = (db, id) => doc(db, 'users', ownerId, 'activities', id)
const activities = (db) => collection(db, 'users', ownerId, 'activities')
const profileRef = (db) => doc(db, 'users', ownerId)
const denied = (operation) => assert.rejects(operation, { code: 'permission-denied' })

function activity(overrides = {}) {
  return {
    dateKey: '2026-10-12',
    activityType: 'development',
    taskName: 'Rules verification',
    status: 'in_progress',
    startAt: Timestamp.fromDate(new Date('2026-10-12T09:00:00Z')),
    endAt: Timestamp.fromDate(new Date('2026-10-12T10:00:00Z')),
    durationMinutes: 60,
    notes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

after(async () => {
  await Promise.all(
    apps.map(async (app) => {
      await terminate(getFirestore(app))
      await deleteApp(app)
    }),
  )
})

test('owner CRUD, daily/monthly queries and server audit fields pass through the rules', async () => {
  const first = activityRef(owner, 'first')
  const second = activityRef(owner, 'second')
  await setDoc(first, activity())
  await setDoc(
    second,
    activity({
      dateKey: '2026-10-13',
      startAt: Timestamp.fromDate(new Date('2026-10-13T09:00:00Z')),
      endAt: Timestamp.fromDate(new Date('2026-10-13T10:00:00Z')),
    }),
  )
  const created = (await getDocFromServer(first)).data()
  assert.ok(created.createdAt instanceof Timestamp)
  assert.ok(created.updatedAt instanceof Timestamp)
  assert.ok(created.createdAt.isEqual(created.updatedAt))

  const daily = () =>
    getDocsFromServer(
      query(activities(owner), where('dateKey', '==', '2026-10-12'), orderBy('startAt')),
    )
  assert.deepEqual(
    (await daily()).docs.map((snapshot) => snapshot.id),
    ['first'],
  )
  const month = await getDocsFromServer(
    query(
      activities(owner),
      where('dateKey', '>=', '2026-10-01'),
      where('dateKey', '<=', '2026-10-31'),
      orderBy('dateKey'),
    ),
  )
  assert.deepEqual(
    month.docs.map((snapshot) => snapshot.id),
    ['first', 'second'],
  )

  await updateDoc(first, {
    dateKey: '2026-10-13',
    status: 'completed',
    startAt: Timestamp.fromDate(new Date('2026-10-13T09:00:00Z')),
    endAt: Timestamp.fromDate(new Date('2026-10-13T10:30:00Z')),
    durationMinutes: 90,
    updatedAt: serverTimestamp(),
  })
  const updated = (await getDocFromServer(first)).data()
  assert.ok(updated.createdAt.isEqual(created.createdAt))
  assert.ok(updated.updatedAt.toMillis() >= created.updatedAt.toMillis())
  assert.equal(updated.durationMinutes, 90)
  assert.equal(updated.status, 'completed')
  assert.equal((await daily()).size, 0)
  await deleteDoc(first)
  await deleteDoc(second)
  assert.equal((await getDocFromServer(first)).exists(), false)
})

test('guests and another user cannot read, list, create, update or delete owner activities', async (t) => {
  await setDoc(activityRef(owner, 'protected'), activity())
  for (const [name, db] of [
    ['guest', guest],
    ['other user', other],
  ]) {
    await t.test(name, async () => {
      await denied(() => getDocFromServer(activityRef(db, 'protected')))
      await denied(() => getDocsFromServer(activities(db)))
      await denied(() => setDoc(activityRef(db, `unauthorized-${name}`), activity()))
      await denied(() =>
        updateDoc(activityRef(db, 'protected'), {
          status: 'completed',
          updatedAt: serverTimestamp(),
        }),
      )
      await denied(() => deleteDoc(activityRef(db, 'protected')))
    })
  }
  await deleteDoc(activityRef(owner, 'protected'))
})

test('activity validation rejects invalid fields and forged audit timestamps', async (t) => {
  const invalid = [
    ['empty task', { taskName: '' }],
    ['whitespace task', { taskName: '  \t  ' }],
    ['long task', { taskName: 'x'.repeat(161) }],
    ['long notes', { notes: 'x'.repeat(1001) }],
    ['unknown type', { activityType: 'unknown' }],
    ['unknown status', { status: 'unknown' }],
    ['invalid date shape', { dateKey: '12/10/2026' }],
    ['invalid month', { dateKey: '2026-13-12' }],
    ['invalid day', { dateKey: '2026-10-00' }],
    ['inverted time', { endAt: Timestamp.fromMillis(0) }],
    ['non-timestamp start', { startAt: '09:00' }],
    ['zero duration', { durationMinutes: 0 }],
    ['duration differs from timestamps', { durationMinutes: 61 }],
    [
      'seconds precision',
      {
        startAt: Timestamp.fromDate(new Date('2026-10-12T09:00:01Z')),
        endAt: Timestamp.fromDate(new Date('2026-10-12T10:00:01Z')),
      },
    ],
    [
      'sub-second precision',
      {
        // Firestore truncates sub-microsecond values, so use a persisted millisecond.
        startAt: new Timestamp(1791795600, 1000000),
        endAt: new Timestamp(1791799200, 1000000),
      },
    ],
    ['fractional duration', { durationMinutes: 1.5 }],
    ['excessive duration', { durationMinutes: 1501 }],
    ['extra field', { uid: ownerId }],
    ['forged creation time', { createdAt: Timestamp.fromMillis(0) }],
    ['forged update time', { updatedAt: Timestamp.fromMillis(0) }],
  ]
  for (const [name, overrides] of invalid) {
    await t.test(name, () =>
      denied(() => setDoc(activityRef(owner, randomUUID()), activity(overrides))),
    )
  }
  await t.test('missing required field', async () => {
    const payload = activity()
    delete payload.notes
    await denied(() => setDoc(activityRef(owner, randomUUID()), payload))
  })
  await setDoc(activityRef(owner, 'immutable'), activity())
  await t.test('creation time cannot change', () =>
    denied(() =>
      updateDoc(activityRef(owner, 'immutable'), {
        createdAt: Timestamp.fromMillis(0),
        updatedAt: serverTimestamp(),
      }),
    ),
  )
  await t.test('invalid update cannot bypass validation', () =>
    denied(() =>
      updateDoc(activityRef(owner, 'immutable'), {
        status: 'invalid',
        updatedAt: serverTimestamp(),
      }),
    ),
  )
  await deleteDoc(activityRef(owner, 'immutable'))
})

test('profile ownership, immutable creation time and denied paths are enforced', async () => {
  await setDoc(profileRef(owner), {
    uid: ownerId,
    displayName: 'Rules owner',
    email: 'owner@example.test',
    photoURL: null,
    provider: 'google',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  })
  const created = (await getDocFromServer(profileRef(owner))).data().createdAt
  await updateDoc(profileRef(owner), {
    displayName: 'Updated owner',
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  })
  assert.ok((await getDocFromServer(profileRef(owner))).data().createdAt.isEqual(created))
  for (const db of [guest, other]) {
    await denied(() => getDocFromServer(profileRef(db)))
    await denied(() =>
      updateDoc(profileRef(db), {
        displayName: 'Intruder',
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      }),
    )
  }
  await denied(() =>
    updateDoc(profileRef(owner), {
      createdAt: Timestamp.fromMillis(0),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    }),
  )
  await denied(() => getDocsFromServer(collection(owner, 'users')))
  await denied(() => deleteDoc(profileRef(owner)))
  await denied(() =>
    setDoc(doc(owner, 'users', ownerId, 'settings', 'preferences'), { dayStart: '09:00' }),
  )
  await denied(() => getDocFromServer(doc(owner, 'unlisted', 'document')))
})
