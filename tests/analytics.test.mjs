import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeDay, getDayStateLabel } from '../src/features/analytics/domain/dailyAnalysis.ts'
import {
  buildMonthAnalysis,
  groupActivitiesByDate,
  getCalendarDayMeta,
} from '../src/features/analytics/domain/monthAnalysis.ts'
import { getDefaultUserPreferences } from '../src/features/settings/config/defaultPreferences.ts'
import { combineDateAndTime, toDateKey } from '../src/utils/date.ts'

const preferences = getDefaultUserPreferences()
const now = new Date(2026, 9, 13, 12)
const dateKey = '2026-10-12'
function activity(start, end, status = 'completed', date = dateKey) {
  const startAt = combineDateAndTime(date, start),
    endAt = combineDateAndTime(date, end)
  return {
    id: `${date}-${start}`,
    dateKey: date,
    startAt,
    endAt,
    durationMinutes: (endAt - startAt) / 60000,
    status,
    activityType: 'development',
    taskName: 'Analysis fixture',
    notes: '',
    createdAt: null,
    updatedAt: null,
  }
}
const analyze = (activities = [], changes = {}) =>
  analyzeDay({ dateKey, activities, preferences, now, ...changes })

test('canonical daily totals and actual bounds use unsorted copied input, not configured bounds', () => {
  const first = activity('09:00', '10:00'),
    second = activity('10:00', '11:00')
  const input = Object.freeze([second, first])
  const result = analyze(input)
  assert.equal(result.totalLoggedMinutes, 120)
  assert.equal(result.workdayTargetMinutes, 540)
  assert.equal(result.remainingTargetMinutes, 420)
  assert.equal(result.scheduledUnloggedMinutes, 420)
  assert.equal(result.overtimeMinutes, 0)
  assert.deepEqual(result.actualStart, first.startAt)
  assert.deepEqual(result.actualEnd, second.endAt)
  assert.equal(input[0], second)
  assert.equal(result.dayState, 'partial')
})

test('required 09–18 manual scenario: 6h30 logged, 1h30 gaps, 2h30 remaining', () => {
  const result = analyze([
    activity('09:00', '10:30'),
    activity('10:30', '11:00'),
    activity('11:30', '13:00'),
    activity('14:00', '17:00'),
  ])
  assert.equal(result.totalLoggedMinutes, 390)
  assert.equal(result.gapCount, 2)
  assert.equal(result.gapMinutes, 90)
  assert.equal(result.remainingTargetMinutes, 150)
  assert.deepEqual(result.actualStart, combineDateAndTime(dateKey, '09:00'))
  assert.deepEqual(result.actualEnd, combineDateAndTime(dateKey, '17:00'))
  assert.deepEqual(
    result.gaps.map((g) => [g.startAt.getHours(), g.startAt.getMinutes(), g.durationMinutes]),
    [
      [11, 0, 30],
      [13, 0, 60],
    ],
  )
})

for (const [logged, state, remaining, overtime, raw, progress] of [
  [0, 'empty', 480, 0, 0, 0],
  [240, 'partial', 240, 0, 50, 50],
  [480, 'target_met', 0, 0, 100, 100],
  [600, 'over_target', 0, 120, 125, 100],
]) {
  test(`${state}: target, remaining, overtime and raw/clamped progress stay distinct`, () => {
    const end = logged === 600 ? '19:00' : logged === 480 ? '17:00' : '13:00'
    const result = analyze(logged ? [activity('09:00', end)] : [], {
      preferences: { ...preferences, dayEndTime: '17:00' },
    })
    assert.equal(result.dayState, state)
    assert.equal(result.remainingTargetMinutes, remaining)
    assert.equal(result.overtimeMinutes, overtime)
    assert.equal(result.completionPercent, raw)
    assert.equal(result.progressPercent, progress)
    assert.equal(result.isTargetMet, logged >= 480)
    assert.equal(result.isOverTarget, logged > 480)
  })
}

test('time target does not require completed task statuses', () => {
  const result = analyze([activity('09:00', '18:00', 'in_progress')])
  assert.equal(result.isTargetMet, true)
  assert.equal(result.completedCount, 0)
  assert.equal(result.openCount, 1)
})
test('exact status counts and open count use one shared analysis', () => {
  const result = analyze([
    activity('09:00', '10:00'),
    activity('10:00', '11:00'),
    activity('11:00', '12:00', 'in_progress'),
    activity('12:00', '13:00', 'on_hold'),
  ])
  assert.deepEqual(
    [result.completedCount, result.inProgressCount, result.onHoldCount, result.openCount],
    [2, 1, 1, 2],
  )
})
test('empty days have zero gaps, null actual bounds and full remaining target', () => {
  const result = analyze()
  assert.equal(result.dayState, 'empty')
  assert.equal(result.gapMinutes, 0)
  assert.equal(result.gapCount, 0)
  assert.equal(result.actualStart, null)
  assert.equal(result.actualEnd, null)
  assert.equal(result.remainingTargetMinutes, 540)
})
test('single activity includes initial gap but no synthetic trailing gap', () => {
  const result = analyze([activity('10:00', '11:00')])
  assert.equal(result.gapMinutes, 60)
  assert.equal(result.gapCount, 1)
  assert.equal(result.totalLoggedMinutes, 60)
  assert.equal(result.remainingTargetMinutes, 480)
})
test('legacy overlaps and earlier starts produce no negative gaps; latest end remains correct', () => {
  const result = analyze([
    activity('08:00', '12:00'),
    activity('09:00', '10:00'),
    activity('11:00', '13:00'),
    activity('14:00', '15:00'),
  ])
  assert.equal(result.gapCount, 1)
  assert.equal(result.gapMinutes, 60)
  assert.deepEqual(result.actualEnd, combineDateAndTime(dateKey, '15:00'))
  assert.equal(result.totalLoggedMinutes, 480) // Persisted durations are summed, including legacy overlaps.
})
test('future state takes precedence even with enough logs; today partial uses in-progress wording', () => {
  for (const rows of [[], [activity('09:00', '19:00')]]) {
    const result = analyze(rows, { now: new Date(2026, 9, 11, 23, 59) })
    assert.equal(result.dayState, 'future')
    assert.equal(result.isFuture, true)
    assert.match(getDayStateLabel(result), /^Future/)
  }
  assert.equal(
    getDayStateLabel(analyze([activity('09:00', '10:00')], { now: new Date(2026, 9, 12, 0, 1) })),
    'Today · In progress',
  )
})
test('zero, inverted and malformed targets never divide by zero', () => {
  for (const dayEndTime of ['09:00', '08:00', 'invalid']) {
    const result = analyze([activity('09:00', '10:00')], {
      preferences: { ...preferences, dayEndTime },
    })
    assert.deepEqual(
      [
        result.workdayTargetMinutes,
        result.completionPercent,
        result.progressPercent,
        result.remainingTargetMinutes,
        result.overtimeMinutes,
      ],
      [0, 0, 0, 0, 0],
    )
    assert.equal(result.isTargetMet, false)
  }
})
test('bad persisted duration falls back, valid stored duration is trusted, invalid intervals are counted and excluded', () => {
  for (const durationMinutes of [NaN, -1, 0, Infinity, 1.5, 1440, 1e100])
    assert.equal(
      analyze([{ ...activity('09:00', '10:00'), durationMinutes }]).totalLoggedMinutes,
      60,
    )
  assert.equal(
    analyze([{ ...activity('09:00', '10:00'), durationMinutes: 30 }]).totalLoggedMinutes,
    30,
  )
  const result = analyze([
    { ...activity('09:00', '10:00'), endAt: new Date(NaN) },
    activity('11:00', '10:00'),
  ])
  assert.equal(result.invalidActivityCount, 2)
  assert.equal(result.totalLoggedMinutes, 0)
  assert.equal(result.gapCount, 0)
})
test('grouping, month totals and calendar metadata ignore out-of-month data and exclude future target days', () => {
  const rows = [
    activity('09:00', '10:00', 'completed', '2026-10-01'),
    activity('10:00', '11:00', 'in_progress', '2026-10-01'),
    activity('09:00', '18:00', 'on_hold', '2026-10-03'),
    activity('09:00', '19:00', 'completed', '2026-10-14'),
    activity('09:00', '18:00', 'completed', '2026-11-01'),
  ]
  const groups = groupActivitiesByDate(rows)
  assert.equal(groups.get('2026-10-01').length, 2)
  assert.equal(groups.get('2026-10-03').length, 1)
  const result = buildMonthAnalysis({ month: now, activities: rows, preferences, now })
  assert.equal(Object.keys(result.days).length, 31)
  assert.equal(result.activeDayCount, 3)
  assert.equal(result.targetMetDayCount, 1)
  assert.equal(result.partialDayCount, 1)
  assert.equal(result.totalActivities, 4)
  assert.equal(result.totalLoggedMinutes, 1260)
  assert.equal(result.averageLoggedMinutesPerActiveDay, 420)
  assert.deepEqual(
    [result.completedActivityCount, result.inProgressActivityCount, result.onHoldActivityCount],
    [2, 1, 1],
  )
  const meta = getCalendarDayMeta(
    '2026-10-03',
    '2026-10-03',
    toDateKey(now),
    result.days['2026-10-03'],
  )
  assert.equal(meta.state, 'target_met')
  assert.equal(meta.isSelected, true)
  assert.equal(meta.loggedMinutes, 540)
  assert.equal(result.days['2026-10-14'].dayState, 'future')
})
test('two active days group correctly, leap months and empty months keep all local dates', () => {
  const rows = [
    activity('09:00', '10:00', 'completed', '2026-10-01'),
    activity('10:00', '11:00', 'completed', '2026-10-01'),
    activity('09:00', '10:00', 'completed', '2026-10-03'),
  ]
  assert.equal(
    buildMonthAnalysis({ month: now, activities: rows, preferences, now }).activeDayCount,
    2,
  )
  const empty = buildMonthAnalysis({
    month: new Date(2024, 1, 1),
    activities: [],
    preferences,
    now,
  })
  assert.equal(Object.keys(empty.days).length, 29)
  assert.equal(empty.days['2024-02-29'].dateKey, '2024-02-29')
  assert.equal(empty.averageLoggedMinutesPerActiveDay, 0)
  assert.equal(empty.totalLoggedMinutes, 0)
})
test('settings recalculate target and gaps without modifying input activities; dates remain local', () => {
  const rows = [activity('10:00', '11:00')]
  const snapshot = JSON.stringify(rows)
  const changed = analyze(rows, {
    preferences: { ...preferences, dayStartTime: '08:00', dayEndTime: '17:00' },
  })
  assert.equal(changed.gapMinutes, 120)
  assert.equal(changed.remainingTargetMinutes, 480)
  assert.equal(JSON.stringify(rows), snapshot)
  assert.equal(changed.actualStart.getHours(), 10)
  assert.equal(toDateKey(changed.actualStart), dateKey)
  assert.throws(() => analyze([], { dateKey: '2026-02-30' }))
})
