import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCompactEodText, buildDetailedEodText } from '../src/features/eod/domain/eodText.ts'
import { buildEodSummary } from '../src/features/eod/domain/eodSummary.ts'
import { analyzeDay } from '../src/features/analytics/domain/dailyAnalysis.ts'
import { getDefaultUserPreferences } from '../src/features/settings/config/defaultPreferences.ts'
import { combineDateAndTime } from '../src/utils/date.ts'
const dateKey = '2026-10-12',
  preferences = { ...getDefaultUserPreferences(), dayEndTime: '17:00' }
function row(start, end, status = 'completed', extra = {}) {
  return {
    id: start,
    dateKey,
    startAt: combineDateAndTime(dateKey, start),
    endAt: combineDateAndTime(dateKey, end),
    durationMinutes: NaN,
    activityType: 'jira_task',
    taskName: 'TD-10310 <API> & fixes',
    status,
    notes: 'line one\n\nCompleted:\nline two',
    createdAt: null,
    updatedAt: null,
    ...extra,
  }
}
function summary(activities = []) {
  return buildEodSummary({
    dateKey,
    activities,
    dailyAnalysis: analyzeDay({ dateKey, activities, preferences }),
  })
}
test('compact groups repeated names once and preserves special characters and durations', () => {
  const text = buildCompactEodText(
    summary([
      row('09:00', '10:00', 'in_progress'),
      row('11:30', '12:15', 'on_hold'),
      row('15:00', '16:30'),
    ]),
    preferences,
  )
  assert.equal(text.split('TD-10310').length - 1, 1)
  assert.match(text, /Completed:\n• TD-10310 <API> & fixes — 3h 15m/)
  assert.match(text, /Logged: 3h 15m \/ 8h/)
  assert.match(text, /Unlogged: 4h 15m/)
})
test('detailed text retains each session, mixed status history, gaps and safe one-line notes', () => {
  const text = buildDetailedEodText(
    summary([row('09:00', '10:00', 'in_progress'), row('11:00', '12:00')]),
    preferences,
  )
  assert.match(text, /09:00–10:00 — 1h · In Progress/)
  assert.match(text, /11:00–12:00 — 1h · Completed/)
  assert.match(text, /Final Status: Completed/)
  assert.match(text, /Notes: line one Completed: line two/)
  assert.match(text, /10:00–11:00 — 1h/)
  assert.match(text, /Sessions: 2/)
})
test('detailed time format honors 12h and 24h for configured, actual, sessions and gaps', () => {
  const result = summary([row('09:00', '10:00'), row('13:00', '14:00')])
  assert.match(buildDetailedEodText(result, preferences), /Configured: 09:00–17:00/)
  const text = buildDetailedEodText(result, { ...preferences, timeFormat: '12h' })
  assert.match(text, /Configured: 9:00 AM–5:00 PM/)
  assert.match(text, /1:00 PM–2:00 PM/)
  assert.match(text, /10:00 AM–1:00 PM/)
})
test('overtime and empty exports remain concise and factual', () => {
  for (const builder of [buildCompactEodText, buildDetailedEodText]) {
    const text = builder(summary([row('09:00', '18:15')]), preferences)
    assert.match(text, /Overtime: 1h 15m/)
    assert.doesNotMatch(text, /Remaining: -/)
    assert.equal(builder(summary(), preferences).split('\n').length, 3)
  }
})
