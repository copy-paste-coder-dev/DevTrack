import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase/firestore'
import { combineDateAndTime, toDateKey, getMonthDateRange, isDateKey } from '../src/utils/date.ts'
import { calculateDurationMinutes, formatDuration } from '../src/utils/duration.ts'
import {
  mapActivityDocument,
  mapActivityToCreatePayload,
  mapActivityToUpdatePayload,
} from '../src/features/activities/utils/activity.mapper.ts'
import {
  getDaySummary,
  countActivitiesByStatus,
  getEarliestStart,
  getLatestEnd,
  sortActivities,
} from '../src/features/activities/utils/activitySummary.ts'
import {
  activityInputSchema,
  activityFormSchema,
} from '../src/features/activities/validation/activity.schema.ts'
import { getActivityErrorMessage } from '../src/features/activities/utils/activityError.ts'

const input = {
  dateKey: '2026-10-12',
  activityType: 'development',
  taskName: '  Fix "+" / #ticket  ',
  status: 'in_progress',
  startAt: combineDateAndTime('2026-10-12', '09:00'),
  endAt: combineDateAndTime('2026-10-12', '10:30'),
  notes: '  Multiline\nnotes  ',
}
test('local calendar dates/time round trip without UTC shifts and reject invalid values', () => {
  for (const time of ['00:01', '23:59']) {
    const date = combineDateAndTime(input.dateKey, time)
    assert.equal(toDateKey(date), input.dateKey)
    assert.equal(date.getHours(), Number(time.slice(0, 2)))
  }
  for (const date of ['2026-02-30', '2026-13-01', 'invalid', '2026-2-01'])
    assert.equal(isDateKey(date), false)
  assert.throws(() => combineDateAndTime(input.dateKey, '24:00'))
  assert.deepEqual(getMonthDateRange(new Date(2024, 1, 29)), {
    startDateKey: '2024-02-01',
    endDateKey: '2024-02-29',
  })
})
test('duration calculation rejects equal, inverted and invalid times', () => {
  assert.equal(calculateDurationMinutes(input.startAt, input.endAt), 90)
  for (const end of [input.startAt, new Date(NaN), new Date(input.startAt.getTime() - 1)])
    assert.throws(() => calculateDurationMinutes(input.startAt, end))
  assert.deepEqual([0, 30, 60, 90, 120].map(formatDuration), ['0m', '30m', '1h', '1h 30m', '2h'])
})
test('write payloads normalize strings, calculate duration and preserve immutable metadata', () => {
  const create = mapActivityToCreatePayload(input),
    update = mapActivityToUpdatePayload(input)
  assert.equal(create.taskName, 'Fix "+" / #ticket')
  assert.equal(create.notes, 'Multiline\nnotes')
  assert.equal(create.durationMinutes, 90)
  assert.ok(create.startAt instanceof Timestamp)
  assert.ok(create.createdAt)
  for (const key of ['createdAt', 'id', 'uid']) assert.equal(key in update, false)
  assert.equal(mapActivityToCreatePayload({ ...input, notes: undefined }).notes, '')
})
test('document mapper uses ID and Date domain fields, tolerates pending audit fields, rejects corrupt data', () => {
  const payload = mapActivityToCreatePayload(input)
  const mapped = mapActivityDocument('doc1', { ...payload, createdAt: null, updatedAt: undefined })
  assert.equal(mapped.id, 'doc1')
  assert.ok(mapped.startAt instanceof Date)
  assert.equal(mapped.createdAt, null)
  assert.equal(mapped.updatedAt, null)
  assert.throws(() =>
    mapActivityDocument('bad', {
      ...payload,
      durationMinutes: 1,
      createdAt: null,
      updatedAt: null,
    }),
  )
  assert.throws(() => mapActivityDocument('bad', { ...payload, startAt: '09:00' }))
})
test('static schemas validate same-day ranges; external-data overlap checks belong to the domain/service', () => {
  for (const change of [
    { taskName: ' ' },
    { activityType: 'invented' },
    { status: 'invented' },
    { dateKey: '2026-10-13' },
    { endAt: input.startAt },
  ])
    assert.equal(activityInputSchema.safeParse({ ...input, ...change }).success, false)
  const form = {
    date: input.dateKey,
    type: 'development',
    name: 'Fix',
    status: 'completed',
    start: '09:00',
    end: '08:00',
    notes: '',
  }
  assert.equal(activityFormSchema.safeParse(form).success, false)
  assert.equal(activityFormSchema.safeParse({ ...form, end: '10:00' }).success, true)
})
test('real summaries handle unsorted overlapping activity blocks, breaks and empty days', () => {
  const first = mapActivityDocument('a', {
    ...mapActivityToCreatePayload(input),
    createdAt: null,
    updatedAt: null,
  })
  const second = {
    ...first,
    id: 'b',
    activityType: 'break',
    status: 'completed',
    startAt: combineDateAndTime(input.dateKey, '09:30'),
    endAt: combineDateAndTime(input.dateKey, '10:00'),
    durationMinutes: 30,
  }
  assert.equal(getDaySummary([second, first]).loggedMinutes, 120)
  assert.equal(getDaySummary([second, first]).workMinutes, 90)
  assert.equal(getDaySummary([second, first]).breakMinutes, 30)
  assert.deepEqual(countActivitiesByStatus([first, second]), {
    completed: 1,
    inProgress: 1,
    onHold: 0,
  })
  assert.equal(sortActivities([second, first])[0].id, 'a')
  assert.equal(getEarliestStart([first, second]).getTime(), first.startAt.getTime())
  assert.equal(getLatestEnd([first, second]).getTime(), first.endAt.getTime())
  assert.deepEqual(getDaySummary([]), {
    startTime: null,
    endTime: null,
    loggedMinutes: 0,
    breakMinutes: 0,
    workMinutes: 0,
  })
})
test('activity errors sanitize backend details', () => {
  assert.match(getActivityErrorMessage({ code: 'permission-denied' }), /permission/)
  assert.match(getActivityErrorMessage({ code: 'failed-precondition' }), /index/)
  assert.match(getActivityErrorMessage({ code: 'app/offline' }), /connection/)
  assert.equal(
    getActivityErrorMessage(new Error('secret'), 'delete'),
    'Unable to delete activity. Please try again.',
  )
})
