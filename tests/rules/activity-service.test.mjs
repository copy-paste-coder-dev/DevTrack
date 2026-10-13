import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { initializeApp, deleteApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore, terminate } from 'firebase/firestore'
import { activityService } from '../../src/features/activities/services/activity.service.ts'
import { combineDateAndTime } from '../../src/utils/date.ts'
import { ActivityTimeError } from '../../src/features/activities/domain/activityTime.ts'

// Exercise the production service and real SDK, confined to the demo emulator.
assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(localhost|127\.0\.0\.1):\d+$/)
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
const uid = `phase4-${randomUUID()}`
const app = initializeApp({ projectId: 'demo-devtrack', apiKey: 'demo-key', appId: 'demo-app' })
const db = getFirestore(app)
connectFirestoreEmulator(db, host, Number(port), { mockUserToken: { sub: uid } })
after(async () => {
  await terminate(db)
  await deleteApp(app)
})
const day = '2026-10-15'
const input = (name, start, end, dateKey = day) => ({
  dateKey,
  taskName: name,
  activityType: 'development',
  status: 'in_progress',
  notes: '',
  startAt: combineDateAndTime(dateKey, start),
  endAt: combineDateAndTime(dateKey, end),
})

test('production service CRUD, overlap defenses, destination-day checks and realtime snapshots', async () => {
  let latest = []
  let readError
  const unsubscribe = activityService.subscribeToActivitiesByDate(
    uid,
    day,
    (rows) => {
      latest = rows
    },
    (cause) => {
      readError = cause
    },
  )
  async function waitFor(predicate) {
    const deadline = Date.now() + 10000
    while (!predicate()) {
      if (readError) throw readError
      assert.ok(Date.now() < deadline, 'Realtime snapshot did not arrive')
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
  }
  try {
    const a = await activityService.createActivity(uid, input('First', '09:00', '10:30'))
    const b = await activityService.createActivity(uid, input('Second', '10:30', '11:00'))
    await waitFor(() => latest.length === 2)
    const created = latest.find((row) => row.id === a).createdAt
    assert.ok(created instanceof Date)
    await assert.rejects(
      activityService.createActivity(uid, input('Collision', '10:45', '11:30')),
      ActivityTimeError,
    )
    assert.equal((await activityService.getActivitiesByDate(uid, day)).length, 2)
    await activityService.updateActivity(uid, b, input('Second unchanged', '10:30', '11:00'))
    const c = await activityService.createActivity(uid, input('Third', '12:00', '13:00'))
    await assert.rejects(
      activityService.updateActivity(uid, b, input('Bad edit', '10:30', '12:30')),
      /Third/,
    )
    const destination = await activityService.createActivity(
      uid,
      input('Destination', '09:00', '10:00', '2026-10-16'),
    )
    await assert.rejects(
      activityService.updateActivity(uid, a, input('Bad move', '09:00', '10:30', '2026-10-16')),
      /Destination/,
    )
    await activityService.updateActivity(uid, a, {
      ...input('Moved', '10:00', '11:01', '2026-10-16'),
      status: 'completed',
    })
    const moved = (await activityService.getActivitiesByDate(uid, '2026-10-16')).find(
      (row) => row.id === a,
    )
    assert.equal(moved.durationMinutes, 61)
    assert.equal(moved.createdAt.getTime(), created.getTime())
    assert.ok(moved.updatedAt >= moved.createdAt)
    await waitFor(() => latest.length === 2 && !latest.some((row) => row.id === a))
    assert.equal((await activityService.getActivitiesByDateRange(uid, day, '2026-10-16')).length, 4)
    await activityService.deleteActivity(uid, c)
    await waitFor(() => latest.length === 1)
    await activityService.deleteActivity(uid, b)
    await activityService.deleteActivity(uid, a)
    await activityService.deleteActivity(uid, destination)
    await waitFor(() => latest.length === 0)
    assert.deepEqual(await activityService.getActivitiesByDateRange(uid, day, '2026-10-16'), [])
    await assert.rejects(activityService.createActivity(uid, input('Invalid', '09:00', '09:00')))
    await assert.rejects(
      activityService.createActivity(`other-${uid}`, input('Forbidden', '09:00', '10:00')),
      { code: 'permission-denied' },
    )
  } finally {
    unsubscribe()
  }
})
