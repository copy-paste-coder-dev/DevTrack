import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { combineDateAndTime, toDateKey } from '../src/utils/date.ts'
import {
  ActivityTimeError,
  assertActivityCanSave,
  buildCreateActivityDefaults,
  calculateDurationMinutes,
  detectActivityGaps,
  findOverlappingActivity,
  getSuggestedActivityStartTime,
  parseTimeRange,
  sortActivities,
  suggestEndTime,
  validateTimeRange,
} from '../src/features/activities/domain/activityTime.ts'
import { activityInputSchema } from '../src/features/activities/validation/activity.schema.ts'

const day = '2026-10-13'
const at = (time, date = day) => combineDateAndTime(date, time)
const activity = (id, start, end, dateKey = day, overrides = {}) => ({
  id,
  dateKey,
  activityType: 'development',
  taskName: id,
  status: 'in_progress',
  startAt: at(start, dateKey),
  endAt: at(end, dateKey),
  notes: '',
  durationMinutes: calculateDurationMinutes(at(start, dateKey), at(end, dateKey)),
  createdAt: null,
  updatedAt: null,
  ...overrides,
})
const candidate = (start, end, dateKey = day) => activity('candidate', start, end, dateKey)

test('canonical ranges accept one minute and reject invalid, equal, reversed, cross-day and sub-minute ranges', () => {
  assert.equal(calculateDurationMinutes(at('09:00'), at('10:45')), 105)
  assert.deepEqual(validateTimeRange(at('09:00'), at('09:01'), day), {
    valid: true,
    durationMinutes: 1,
  })
  for (const [start, end] of [
    [at('09:00'), at('09:00')],
    [at('10:00'), at('09:00')],
    [new Date(NaN), at('09:00')],
    [at('23:00'), at('01:00', '2026-10-14')],
    [at('09:00'), new Date(at('09:00').getTime() + 30000)],
  ]) {
    assert.equal(validateTimeRange(start, end, day).valid, false)
    assert.throws(() => calculateDurationMinutes(start, end), ActivityTimeError)
  }
  const withSeconds = new Date(at('09:00').getTime() + 1000)
  assert.equal(
    activityInputSchema.safeParse({ ...candidate('09:00', '10:00'), startAt: withSeconds }).success,
    false,
  )
  assert.equal(parseTimeRange(day, '23:30', '00:30').valid, false)
  assert.equal(parseTimeRange('2026-02-30', '09:00', '10:00').valid, false)
})

test('suggestion uses the selected day, configured start, latest end, ties and unsorted data', () => {
  const a = activity('a', '09:00', '10:00')
  const b = activity('b', '12:00', '13:00')
  assert.equal(getSuggestedActivityStartTime(day, [], '09:30'), '09:30')
  assert.equal(getSuggestedActivityStartTime(day, [a], '09:00'), '10:00')
  assert.equal(getSuggestedActivityStartTime(day, [b, a], '09:00'), '13:00')
  assert.equal(
    getSuggestedActivityStartTime(day, [b, a, activity('tie', '12:30', '13:00')], '09:00'),
    '13:00',
  )
  for (const selected of ['2020-01-01', '2030-12-31']) {
    assert.equal(getSuggestedActivityStartTime(selected, [a], '08:45'), '08:45')
    assert.equal(
      getSuggestedActivityStartTime(
        selected,
        [a, activity('other', '10:00', '11:00', selected)],
        '08:45',
      ),
      '11:00',
    )
  }
})

test('sorting is deterministic and leaves frozen input intact', () => {
  const a = activity('a', '09:00', '10:00'),
    b = activity('b', '09:00', '10:00')
  const input = Object.freeze([b, a])
  assert.deepEqual(
    sortActivities(input).map((a) => a.id),
    ['a', 'b'],
  )
  assert.equal(input[0], b)
})

test('legacy seconds round suggestions forward and gap boundaries inward without changing stored times', () => {
  const first = activity('legacy', '09:00', '10:00')
  first.endAt = new Date(first.endAt.getTime() + 45000)
  const later = activity('later', '10:02', '11:00')
  assert.equal(getSuggestedActivityStartTime(day, [first], '09:00'), '10:01')
  const [gap] = detectActivityGaps(day, [first, later])
  assert.equal(gap.startAt.getTime(), at('10:01').getTime())
  assert.equal(gap.endAt.getTime(), at('10:02').getTime())
  assert.doesNotThrow(() =>
    assertActivityCanSave({ ...candidate('10:01', '10:02'), ...gap }, [first, later]),
  )
  assert.equal(first.endAt.getSeconds(), 45)
  const fullDay = activity('full', '23:00', '23:59')
  fullDay.endAt = new Date(fullDay.endAt.getTime() + 45000)
  assert.equal(getSuggestedActivityStartTime(day, [fullDay], '09:00'), '')
})

test('all overlap shapes reject, boundaries touch safely, breaks/on-hold occupy time', () => {
  const existing = activity('Break', '10:00', '11:00', day, {
    activityType: 'break',
    status: 'on_hold',
  })
  for (const [start, end, overlaps] of [
    ['09:00', '10:00', false],
    ['11:00', '12:00', false],
    ['09:30', '10:30', true],
    ['10:30', '11:30', true],
    ['10:00', '11:00', true],
    ['10:15', '10:45', true],
    ['09:00', '12:00', true],
  ])
    assert.equal(Boolean(findOverlappingActivity(candidate(start, end), [existing])), overlaps)
  assert.equal(
    findOverlappingActivity(candidate('10:00', '11:00', '2026-10-14'), [existing]),
    undefined,
  )
  assert.throws(
    () => assertActivityCanSave(candidate('10:00', '11:00'), [existing]),
    /Break.*10:00–11:00/,
  )
})

test('editing excludes its own ID but rejects collisions on either side and destination date', () => {
  const a = activity('a', '09:00', '10:00'),
    b = activity('b', '10:00', '11:00'),
    c = activity('c', '11:00', '12:00')
  assert.doesNotThrow(() => assertActivityCanSave(b, [a, b, c], 'b'))
  assert.equal(findOverlappingActivity(candidate('10:00', '11:30'), [a, b, c], 'b').id, 'c')
  assert.equal(findOverlappingActivity(candidate('09:30', '11:00'), [a, b, c], 'b').id, 'a')
  const moved = candidate('10:00', '11:00', '2026-10-14')
  assert.throws(
    () =>
      assertActivityCanSave(
        moved,
        [b, activity('destination', '10:30', '11:30', '2026-10-14')],
        'b',
      ),
    /destination/,
  )
})

test('gap detection covers continuous, initial, unsorted, nested legacy overlaps and minute precision', () => {
  const a = activity('a', '09:00', '10:00')
  assert.deepEqual(detectActivityGaps(day, [], '08:00'), [])
  assert.deepEqual(detectActivityGaps(day, [a, activity('b', '10:00', '11:00')], '09:00'), [])
  assert.equal(detectActivityGaps(day, [a], '08:00')[0].durationMinutes, 60)
  const gaps = detectActivityGaps(
    day,
    [activity('c', '12:00', '13:00'), a, activity('b', '10:30', '11:00')],
    '09:00',
  )
  assert.deepEqual(
    gaps.map((g) => g.durationMinutes),
    [30, 60],
  )
  assert.equal(gaps[0].startAt.getTime(), at('10:00').getTime())
  assert.equal(gaps[1].endAt.getTime(), at('12:00').getTime())
  assert.deepEqual(
    detectActivityGaps(
      day,
      [
        activity('wide', '08:00', '12:00'),
        a,
        activity('nested', '11:00', '11:30'),
        activity('last', '12:00', '13:00'),
      ],
      '09:00',
    ),
    [],
  )
  const seconds = { ...a, endAt: new Date(at('10:00').getTime() + 45000) }
  assert.deepEqual(detectActivityGaps(day, [seconds, activity('b', '10:00', '11:00')]), [])
  assert.equal(detectActivityGaps(day, [a, activity('b', '10:01', '11:00')])[0].durationMinutes, 1)
})

test('generic defaults append, gap defaults fill exactly, deletes recalculate and near midnight does not wrap', () => {
  const a = activity('a', '09:00', '10:00'),
    b = activity('b', '10:00', '11:00'),
    c = activity('c', '11:00', '12:00')
  const defaults = (activities, gap) =>
    buildCreateActivityDefaults({ dateKey: day, activities, dayStartTime: '09:00', gap })
  assert.equal(defaults([a, b]).start, '11:00')
  assert.equal(defaults([a, c]).start, '12:00')
  const gap = detectActivityGaps(day, [a, c])[0]
  assert.deepEqual([defaults([a, c], gap).start, defaults([a, c], gap).end], ['10:00', '11:00'])
  assert.equal(defaults([a]).start, '10:00')
  assert.equal(defaults([]).end, '09:30')
  assert.equal(suggestEndTime('23:45'), '')
  assert.equal(suggestEndTime('23:00'), '23:30')
})

test('local date round trips hold in Kolkata and DST timezones; nonexistent DST times reject', () => {
  for (const TZ of ['Asia/Kolkata', 'America/Los_Angeles', 'Europe/Berlin']) {
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import assert from 'node:assert/strict';
      import {combineDateAndTime,toDateKey} from './src/utils/date.ts';
      for (const time of ['00:05','23:55']) {
        const date=combineDateAndTime('2026-10-13',time);
        assert.equal(toDateKey(date),'2026-10-13');
        assert.equal(date.getSeconds(),0); assert.equal(date.getMilliseconds(),0);
        assert.equal(date.getHours(),Number(time.slice(0,2)));
      }
      if (process.env.TZ==='America/Los_Angeles') assert.throws(()=>combineDateAndTime('2026-03-08','02:30'));
    `,
      ],
      { env: { ...process.env, TZ }, stdio: 'pipe' },
    )
  }
  assert.equal(toDateKey(at('00:05')), day)
})
