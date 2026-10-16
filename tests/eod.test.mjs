import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildEodSummary,
  normalizeTaskName,
  groupActivitiesIntoWorkItems,
} from '../src/features/eod/domain/eodSummary.ts'
import { analyzeDay } from '../src/features/analytics/domain/dailyAnalysis.ts'
import { getDefaultUserPreferences } from '../src/features/settings/config/defaultPreferences.ts'
import { combineDateAndTime } from '../src/utils/date.ts'

export const preferences = { ...getDefaultUserPreferences(), dayEndTime: '17:00' }
export const dateKey = '2026-10-12'
export function activity(start, end, changes = {}) {
  const startAt = combineDateAndTime(dateKey, start),
    endAt = combineDateAndTime(dateKey, end)
  return {
    id: start,
    dateKey,
    startAt,
    endAt,
    durationMinutes: (endAt - startAt) / 60000,
    activityType: 'jira_task',
    taskName: 'TD-10310 - Fix API',
    status: 'in_progress',
    notes: '',
    createdAt: null,
    updatedAt: null,
    ...changes,
  }
}
export function summary(activities = [], prefs = preferences) {
  const dailyAnalysis = analyzeDay({
    dateKey,
    activities,
    preferences: prefs,
    now: new Date(2026, 9, 15),
  })
  return buildEodSummary({ dateKey, activities, dailyAnalysis })
}

test('normalization preserves IDs and hyphens while collapsing whitespace and case', () => {
  assert.equal(normalizeTaskName('  TD-10310 -  Fix\n API '), 'td-10310 - fix api')
})
test('unsorted repeated sessions group once, retain details, total 3h15 and use latest status', () => {
  const rows = Object.freeze([
    activity('15:00', '16:30', { status: 'completed', notes: 'Done' }),
    activity('09:00', '10:00'),
    activity('11:30', '12:15', { taskName: ' td-10310 -  fix API ', status: 'on_hold' }),
  ])
  const result = summary(rows),
    group = result.completedGroups[0]
  assert.equal(result.activitySessionCount, 3)
  assert.equal(result.uniqueWorkItemCount, 1)
  assert.equal(result.totalLoggedMinutes, 195)
  assert.equal(group.totalDurationMinutes, 195)
  assert.equal(group.sessionCount, 3)
  assert.equal(group.taskName, 'TD-10310 - Fix API')
  assert.deepEqual(
    group.sessions.map((s) => s.activityId),
    ['09:00', '11:30', '15:00'],
  )
  assert.deepEqual(
    group.sessions.map((s) => s.status),
    ['in_progress', 'on_hold', 'completed'],
  )
  assert.equal(group.sessions[2].notes, 'Done')
  assert.equal(rows[0].id, '15:00')
})
test('type is part of identity; breakdown counts sessions and unique tasks with exact percentages', () => {
  const result = summary([
    activity('09:00', '10:00'),
    activity('11:00', '12:00'),
    activity('13:00', '14:00', { activityType: 'meeting', status: 'on_hold' }),
  ])
  assert.equal(result.uniqueWorkItemCount, 2)
  assert.equal(result.onHoldGroups.length, 1)
  const [jira, meeting] = result.activityTypeBreakdown
  assert.deepEqual(
    [jira.activityCount, jira.uniqueTaskCount, jira.totalDurationMinutes],
    [2, 1, 120],
  )
  assert.equal(jira.percentageOfLoggedTime, (120 / 180) * 100)
  assert.equal(meeting.percentageOfLoggedTime, (60 / 180) * 100)
  assert.equal(
    result.activityTypeBreakdown.reduce((s, b) => s + b.totalDurationMinutes, 0),
    result.totalLoggedMinutes,
  )
})
test('empty day is finite with empty arrays and null actual times', () => {
  const result = summary()
  assert.equal(result.totalLoggedMinutes, 0)
  assert.equal(result.activitySessionCount, 0)
  assert.equal(result.uniqueWorkItemCount, 0)
  assert.equal(result.actualStart, null)
  assert.equal(result.actualEnd, null)
  for (const field of [
    'completedGroups',
    'inProgressGroups',
    'onHoldGroups',
    'activityTypeBreakdown',
    'gaps',
  ])
    assert.deepEqual(result[field], [])
})
test('gap and daily total fields pass through unchanged; malformed records follow canonical policy', () => {
  const activities = [
    activity('10:00', '11:00', { durationMinutes: NaN }),
    activity('12:00', '13:00', { durationMinutes: 30 }),
    activity('14:00', '13:00'),
    activity('09:00', '10:00', { dateKey: '2026-10-11' }),
  ]
  const dailyAnalysis = analyzeDay({ dateKey, activities, preferences })
  const result = buildEodSummary({ dateKey, activities, dailyAnalysis })
  assert.equal(result.gaps, dailyAnalysis.gaps)
  assert.equal(result.totalGapMinutes, dailyAnalysis.gapMinutes)
  assert.equal(result.gapCount, dailyAnalysis.gapCount)
  assert.equal(result.totalLoggedMinutes, 90)
  assert.equal(result.activitySessionCount, 2)
  assert.equal(result.invalidActivityCount, 1)
  assert.equal(result.inProgressGroups[0].totalDurationMinutes, 90)
  assert.throws(() => buildEodSummary({ dateKey: '2026-10-11', activities, dailyAnalysis }))
})
test('status sections remain chronological and tie ordering is deterministic', () => {
  const groups = groupActivitiesIntoWorkItems([
    activity('11:00', '12:00', { taskName: 'Later' }),
    activity('09:00', '10:00'),
    activity('09:00', '10:00', { id: 'z', status: 'on_hold' }),
  ])
  assert.equal(groups[0].finalStatus, 'on_hold')
  assert.equal(groups[1].taskName, 'Later')
})
