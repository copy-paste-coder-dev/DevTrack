import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, test } from 'node:test'
import { initializeApp, deleteApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore, terminate } from 'firebase/firestore'
import { activityService } from '../../src/features/activities/services/activity.service.ts'
import { combineDateAndTime } from '../../src/utils/date.ts'
import { ActivityTimeError } from '../../src/features/activities/domain/activityTime.ts'
import { buildMonthAnalysis } from '../../src/features/analytics/domain/monthAnalysis.ts'
import { settingsService } from '../../src/features/settings/services/settings.service.ts'
import {
  buildDuplicateActivityDefaults,
  buildRecentTasks,
} from '../../src/features/activities/domain/productivity.ts'
import { mapFormToActivityInput } from '../../src/features/activities/validation/activity.schema.ts'
import { getDefaultUserPreferences } from '../../src/features/settings/config/defaultPreferences.ts'

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

test('Phase 7 recent query is limited, ordered and owner scoped; duplicate uses unchanged production CRUD/schema', async () => {
  const ids = []
  const dateKey = '2026-10-20'
  const preferences = getDefaultUserPreferences()
  try {
    for (let index = 0; index < 32; index++) {
      const startMinutes = 9 * 60 + index * 2
      const time = (minutes) =>
        `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
      ids.push(
        await activityService.createActivity(uid, {
          ...input(`Recent ${index}`, time(startMinutes), time(startMinutes + 1), dateKey),
          status: 'completed',
        }),
      )
    }
    const recent = await activityService.getRecentActivities(uid)
    assert.equal(recent.length, 30)
    assert.equal(recent[0].taskName, 'Recent 31')
    assert.equal(recent.at(-1).taskName, 'Recent 2')
    assert.equal(buildRecentTasks(recent, preferences.enabledActivityTypes).length, 30)
    await assert.rejects(activityService.getRecentActivities(`other-${uid}`), {
      code: 'permission-denied',
    })
    const rows = await activityService.getActivitiesByDate(uid, dateKey)
    const values = buildDuplicateActivityDefaults({
      original: rows[0],
      dateKey,
      activities: rows,
      preferences,
    })
    const duplicate = await activityService.createActivity(uid, mapFormToActivityInput(values))
    ids.push(duplicate)
    const saved = (await activityService.getActivitiesByDate(uid, dateKey)).find(
      (row) => row.id === duplicate,
    )
    assert.equal(saved.taskName, rows[0].taskName)
    assert.equal(saved.status, 'in_progress')
    assert.equal(saved.durationMinutes, 1)
    assert.ok(saved.startAt >= rows.at(-1).endAt)
    assert.deepEqual(
      Object.keys(saved).sort(),
      [
        'id',
        'dateKey',
        'activityType',
        'taskName',
        'status',
        'startAt',
        'endAt',
        'durationMinutes',
        'notes',
        'createdAt',
        'updatedAt',
      ].sort(),
    )
  } finally {
    for (const id of ids) await activityService.deleteActivity(uid, id)
  }
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

test('Phase 6 production month snapshots and preference snapshots recalculate shared analytics after CRUD', async () => {
  const now = new Date(2026, 9, 20, 12)
  let rows = []
  let preferences
  let failure
  const unsubscribeActivities = activityService.subscribeToActivitiesByRange(
    uid,
    '2026-10-01',
    '2026-10-31',
    (values) => {
      rows = values
    },
    (cause) => {
      failure = cause
    },
  )
  const unsubscribePreferences = settingsService.subscribeToUserPreferences(
    uid,
    (values) => {
      preferences = values
    },
    (cause) => {
      failure = cause
    },
  )
  const analysis = () => buildMonthAnalysis({ month: now, activities: rows, preferences, now })
  async function waitFor(predicate) {
    const deadline = Date.now() + 10000
    while (!predicate()) {
      if (failure) throw failure
      assert.ok(Date.now() < deadline, 'Month/preference realtime snapshot did not arrive')
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
  }
  const ids = []
  try {
    await settingsService.createDefaultUserPreferences(uid)
    await waitFor(() => Boolean(preferences))
    const first = await activityService.createActivity(
      uid,
      input('Analytics first', '09:00', '10:00'),
    )
    ids.push(first)
    const second = await activityService.createActivity(
      uid,
      input('Analytics second', '11:00', '12:00'),
    )
    ids.push(second)
    await waitFor(() => rows.length === 2)
    assert.equal(analysis().totalLoggedMinutes, 120)
    assert.equal(analysis().days[day].remainingTargetMinutes, 420)
    assert.equal(analysis().days[day].gapMinutes, 60)
    await settingsService.updateUserPreferences(uid, {
      ...preferences,
      dayStartTime: '08:00',
      dayEndTime: '16:00',
      timeFormat: '12h',
    })
    await waitFor(() => preferences?.dayStartTime === '08:00')
    assert.equal(analysis().days[day].workdayTargetMinutes, 480)
    assert.equal(analysis().days[day].remainingTargetMinutes, 360)
    assert.equal(analysis().days[day].gapMinutes, 120)
    await activityService.updateActivity(uid, first, {
      ...input('Analytics edited', '09:00', '11:00'),
      status: 'completed',
    })
    await waitFor(() => rows.find((row) => row.id === first)?.durationMinutes === 120)
    assert.equal(analysis().totalLoggedMinutes, 180)
    assert.equal(analysis().completedActivityCount, 1)
    assert.equal(analysis().days[day].gapMinutes, 60)
    await activityService.deleteActivity(uid, second)
    await waitFor(() => rows.length === 1)
    assert.equal(analysis().totalLoggedMinutes, 120)
    assert.equal(analysis().activeDayCount, 1)
    await activityService.deleteActivity(uid, first)
    await waitFor(() => rows.length === 0)
    assert.equal(analysis().activeDayCount, 0)
    assert.equal(analysis().totalLoggedMinutes, 0)
  } finally {
    unsubscribeActivities()
    unsubscribePreferences()
    for (const id of ids) await activityService.deleteActivity(uid, id)
  }
})
