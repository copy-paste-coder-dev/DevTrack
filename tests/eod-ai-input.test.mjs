import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAiEodInput } from '../src/features/eod/domain/aiInput.ts'
import { buildEodSummary } from '../src/features/eod/domain/eodSummary.ts'
import { analyzeDay } from '../src/features/analytics/domain/dailyAnalysis.ts'
import { getDefaultUserPreferences } from '../src/features/settings/config/defaultPreferences.ts'
import { combineDateAndTime } from '../src/utils/date.ts'
test('AI input is an explicit grouped allowlist without session notes, metadata or identity', () => {
  const dateKey = '2026-10-12',
    preferences = getDefaultUserPreferences()
  const activities = ['09:00', '11:00'].map((start, index) => ({
    id: `private-id-${index}`,
    dateKey,
    startAt: combineDateAndTime(dateKey, start),
    endAt: combineDateAndTime(dateKey, index ? '12:00' : '10:00'),
    durationMinutes: 60,
    activityType: 'jira_task',
    taskName: 'TD-1',
    status: index ? 'completed' : 'in_progress',
    notes: 'private-note',
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
  const input = buildAiEodInput(
    buildEodSummary({
      dateKey,
      activities,
      dailyAnalysis: analyzeDay({ dateKey, activities, preferences }),
    }),
  )
  assert.equal(input.tasks.length, 1)
  assert.equal(input.tasks[0].sessionCount, 2)
  assert.equal(input.tasks[0].totalDuration, '2h')
  assert.equal(input.tasks[0].status, 'completed')
  assert.doesNotMatch(JSON.stringify(input), /private|createdAt|updatedAt|startAt|endAt|uid|email/)
})
