import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activityTypes } from '../src/features/activities/types/activity.ts'
import { getDefaultUserPreferences } from '../src/features/settings/config/defaultPreferences.ts'
import { userPreferencesSchema } from '../src/features/settings/validation/preferences.schema.ts'
import { mapUserPreferences } from '../src/features/settings/utils/preferences.mapper.ts'
import {
  calculateWorkdayMinutes,
  calculateRemainingWorkMinutes,
  calculateWorkdayProgress,
} from '../src/features/settings/utils/workday.ts'
import { formatTime, formatTimeString } from '../src/features/settings/utils/timeFormat.ts'
import {
  getActivityTypeOptions,
  getDefaultActivityType,
} from '../src/features/settings/utils/activityTypeOptions.ts'
import { getPreferencesErrorMessage } from '../src/features/settings/utils/preferencesError.ts'

test('default preferences have one canonical shape and independent enabled arrays', () => {
  const first = getDefaultUserPreferences(),
    second = getDefaultUserPreferences()
  assert.deepEqual(first, {
    dayStartTime: '09:00',
    dayEndTime: '18:00',
    timeFormat: '24h',
    enabledActivityTypes: [...activityTypes],
  })
  first.enabledActivityTypes.pop()
  assert.equal(second.enabledActivityTypes.length, 9)
})
test('preferences schema validates known formats/types, unique nonempty types and same-day work windows', () => {
  const valid = getDefaultUserPreferences()
  for (const patch of [
    { dayStartTime: '9:00' },
    { dayEndTime: '24:00' },
    { dayEndTime: '09:00' },
    { dayStartTime: '18:00', dayEndTime: '09:00' },
    { timeFormat: '12' },
    { enabledActivityTypes: [] },
    { enabledActivityTypes: ['invented'] },
    { enabledActivityTypes: ['meeting', 'meeting'] },
  ])
    assert.equal(userPreferencesSchema.safeParse({ ...valid, ...patch }).success, false)
  assert.equal(
    userPreferencesSchema.safeParse({
      ...valid,
      dayEndTime: '09:01',
      enabledActivityTypes: ['break'],
    }).success,
    true,
  )
})
test('partial old documents fill absent fields but malformed values are rejected', () => {
  assert.deepEqual(mapUserPreferences({}), getDefaultUserPreferences())
  assert.deepEqual(mapUserPreferences({ dayStartTime: '08:30' }), {
    ...getDefaultUserPreferences(),
    dayStartTime: '08:30',
  })
  assert.deepEqual(
    mapUserPreferences({
      ...getDefaultUserPreferences(),
      createdAt: 'audit',
      unknown: 'old-field',
    }),
    getDefaultUserPreferences(),
  )
  for (const raw of [
    null,
    [],
    { timeFormat: null },
    { enabledActivityTypes: [] },
    { dayStartTime: '20:00' },
  ])
    assert.throws(() => mapUserPreferences(raw))
})
test('workday calculations use wall-clock minutes and allow short windows', () => {
  assert.equal(calculateWorkdayMinutes('09:00', '18:00'), 540)
  assert.equal(calculateWorkdayMinutes('08:30', '17:30'), 540)
  assert.equal(calculateWorkdayMinutes('09:00', '09:30'), 30)
  assert.equal(calculateWorkdayMinutes('00:00', '23:59'), 1439)
  for (const times of [
    ['09:00', '09:00'],
    ['18:00', '09:00'],
    ['invalid', '18:00'],
  ])
    assert.throws(() => calculateWorkdayMinutes(...times))
})
test('remaining target subtracts total logged minutes, never latest end or a negative result', () => {
  const window = { dayStartTime: '09:00', dayEndTime: '18:00' }
  assert.equal(calculateRemainingWorkMinutes({ ...window, totalLoggedMinutes: 390 }), 150)
  assert.equal(calculateRemainingWorkMinutes({ ...window, totalLoggedMinutes: 0 }), 540)
  assert.equal(calculateRemainingWorkMinutes({ ...window, totalLoggedMinutes: 600 }), 0)
  assert.equal(calculateWorkdayProgress(270, 540), 50)
  assert.equal(calculateWorkdayProgress(600, 540), 100)
  assert.equal(calculateWorkdayProgress(-1, 540), 0)
})
test('time formatting handles midnight/noon/PM and does not mutate timestamps', () => {
  for (const [time, expected] of [
    ['00:00', '12:00 AM'],
    ['09:00', '9:00 AM'],
    ['12:00', '12:00 PM'],
    ['14:30', '2:30 PM'],
    ['23:59', '11:59 PM'],
  ]) {
    assert.equal(formatTimeString(time, '12h'), expected)
    assert.equal(formatTimeString(time, '24h'), time)
  }
  const date = new Date(2026, 9, 13, 14, 30)
  const stamp = date.getTime()
  assert.equal(formatTime(date, '12h'), '2:30 PM')
  assert.equal(date.getTime(), stamp)
  assert.throws(() => formatTimeString('2:30 PM', '12h'))
})
test('create options filter disabled types; edit options retain only the original disabled type', () => {
  const enabled = Object.freeze(['jira_task', 'break'])
  assert.deepEqual(getActivityTypeOptions(enabled), [
    { type: 'jira_task', isDisabled: false },
    { type: 'break', isDisabled: false },
  ])
  assert.deepEqual(
    getActivityTypeOptions(enabled, 'meeting').find((item) => item.type === 'meeting'),
    { type: 'meeting', isDisabled: true },
  )
  assert.equal(
    getActivityTypeOptions(enabled, 'meeting').some((item) => item.type === 'development'),
    false,
  )
  assert.equal(getActivityTypeOptions(enabled, 'break').length, 2)
  assert.equal(getDefaultActivityType(enabled), 'jira_task')
  assert.equal(getDefaultActivityType(['meeting', 'development']), 'development')
})
test('preference errors expose useful guidance without raw backend details', () => {
  assert.match(getPreferencesErrorMessage({ code: 'permission-denied' }), /permission/)
  assert.match(getPreferencesErrorMessage({ code: 'unavailable' }), /temporarily/)
  assert.match(getPreferencesErrorMessage({ code: 'app/offline' }), /connection/)
  assert.equal(
    getPreferencesErrorMessage(new Error('private')),
    'Unable to save settings. Please try again.',
  )
})
