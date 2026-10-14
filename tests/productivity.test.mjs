import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDuplicateActivityDefaults,
  buildRecentTasks,
  filterRecentTasks,
  filterActivities,
} from '../src/features/activities/domain/productivity.ts'
import {
  getActivityShortcut,
  isEditableElement,
  isSaveShortcut,
} from '../src/features/productivity/utils/keyboard.ts'
import {
  suggestEndTime,
  parseTimeRange,
  findOverlappingActivity,
} from '../src/features/activities/domain/activityTime.ts'
import { getDefaultUserPreferences } from '../src/features/settings/config/defaultPreferences.ts'
import { combineDateAndTime } from '../src/utils/date.ts'

const preferences = getDefaultUserPreferences()
const day = '2026-10-12'
const row = (id, start, end, changes = {}) => ({
  id,
  dateKey: day,
  taskName: id,
  activityType: 'jira_task',
  status: 'completed',
  notes: 'Useful context',
  createdAt: null,
  updatedAt: null,
  startAt: combineDateAndTime(day, start),
  endAt: combineDateAndTime(day, end),
  durationMinutes: (combineDateAndTime(day, end) - combineDateAndTime(day, start)) / 60000,
  ...changes,
})
const original = row('ABC', '09:00', '10:30')
const key = (changes = {}) => ({
  key: 'n',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
  defaultPrevented: false,
  target: null,
  ...changes,
})

test('letter/date shortcuts ignore editable fields, descendants, composing, repeat, modifiers, handled events and overlays', () => {
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'input']) {
    const target = { tagName }
    assert.equal(isEditableElement(target), true)
    assert.equal(getActivityShortcut(key({ target }), false), null)
  }
  for (const target of [{ isContentEditable: true }, { closest: () => ({}) }])
    assert.equal(getActivityShortcut(key({ target }), false), null)
  for (const changes of [
    { repeat: true },
    { isComposing: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { shiftKey: true },
    { defaultPrevented: true },
  ])
    assert.equal(getActivityShortcut(key(changes), false), null)
  assert.equal(getActivityShortcut(key(), true), null)
  assert.equal(isEditableElement(null), false)
  assert.equal(isEditableElement({ tagName: 'BUTTON', closest: () => null }), false)
})
test('required route commands are recognized with deliberate modifier rules', () => {
  for (const [event, result] of [
    [{}, 'new'],
    [{ key: 'N' }, 'new'],
    [{ key: 't' }, 'today'],
    [{ key: '?', shiftKey: true }, 'help'],
    [{ key: 'ArrowLeft', altKey: true }, 'previous'],
    [{ key: 'ArrowRight', altKey: true }, 'next'],
  ])
    assert.equal(getActivityShortcut(key(event), false), result)
  for (const event of [
    { key: 'ArrowLeft' },
    { key: 'ArrowRight', altKey: true, shiftKey: true },
    { key: 'f' },
  ])
    assert.equal(getActivityShortcut(key(event), false), null)
})
test('save accepts Ctrl/Cmd Enter only, ignoring repeat/composition and extra modifiers', () => {
  assert.equal(isSaveShortcut(key({ key: 'Enter', ctrlKey: true })), true)
  assert.equal(isSaveShortcut(key({ key: 'Enter', metaKey: true })), true)
  for (const changes of [
    {},
    { ctrlKey: true, repeat: true },
    { metaKey: true, isComposing: true },
    { ctrlKey: true, altKey: true },
    { ctrlKey: true, shiftKey: true },
  ])
    assert.equal(isSaveShortcut(key({ key: 'Enter', ...changes })), false)
})
test('quick durations use the canonical same-day helper and do not alter start', () => {
  assert.deepEqual(
    [15, 30, 60, 120].map((value) => suggestEndTime('10:00', value)),
    ['10:15', '10:30', '11:00', '12:00'],
  )
  assert.equal(suggestEndTime('23:30', 30), '')
  assert.equal(suggestEndTime('23:00', 120), '')
  assert.equal(suggestEndTime('', 15), '')
  assert.equal(parseTimeRange(day, '23:00', '').valid, false)
})
test('duplicate copies task/type/notes/duration, resets status and uses the full current timeline latest end', () => {
  const rows = Object.freeze([row('last', '13:00', '14:00'), original])
  const before = JSON.stringify(rows)
  const result = buildDuplicateActivityDefaults({
    original,
    dateKey: day,
    activities: rows,
    preferences,
  })
  assert.deepEqual(result, {
    date: day,
    type: 'jira_task',
    name: 'ABC',
    status: 'in_progress',
    start: '14:00',
    end: '15:30',
    notes: 'Useful context',
  })
  assert.equal(JSON.stringify(rows), before)
  const range = parseTimeRange(result.date, result.start, result.end)
  assert.equal(findOverlappingActivity({ dateKey: day, ...range }, rows), undefined)
})
test('duplicate empty day uses configured start; source old dates/timestamps/audit fields never carry forward', () => {
  const result = buildDuplicateActivityDefaults({
    original,
    dateKey: '2026-10-14',
    activities: [original],
    preferences: { ...preferences, dayStartTime: '08:30' },
  })
  assert.equal(result.date, '2026-10-14')
  assert.equal(result.start, '08:30')
  assert.equal(result.end, '10:00')
  for (const field of ['id', 'createdAt', 'updatedAt']) assert.equal(field in result, false)
})
test('duplicate disabled source falls back to enabled type and midnight leaves end blank without silently shortening duration', () => {
  const result = buildDuplicateActivityDefaults({
    original,
    dateKey: day,
    activities: [row('late', '22:00', '23:30')],
    preferences: { ...preferences, enabledActivityTypes: ['break'] },
  })
  assert.equal(result.type, 'break')
  assert.equal(result.start, '23:30')
  assert.equal(result.end, '')
  assert.equal(result.name, 'ABC')
})
test('recent tasks sort newest first, deduplicate normalized names and hide disabled types', () => {
  const result = buildRecentTasks(
    [
      row('a', '09:00', '10:00', { taskName: ' TD-1 ' }),
      row('b', '10:00', '11:00', { taskName: 'TD-2' }),
      row('c', '11:00', '12:00', { taskName: 'td-1' }),
      row('d', '12:00', '13:00', { taskName: 'private disabled', activityType: 'code_review' }),
    ],
    ['jira_task'],
  )
  assert.deepEqual(
    result.map((item) => item.taskName),
    ['td-1', 'TD-2'],
  )
  assert.equal(result[0].lastUsedAt.getHours(), 11)
})
test('recent suggestions filter locally, trim/case-fold and cap visible results to five', () => {
  const suggestions = buildRecentTasks(
    Array.from({ length: 10 }, (_, index) => row(`Task ${index}`, '09:00', '10:00')),
    preferences.enabledActivityTypes,
  )
  assert.equal(filterRecentTasks(suggestions, '').length, 5)
  assert.equal(filterRecentTasks(suggestions, ' TASK  3 ')[0].taskName, 'Task 3')
  assert.equal(filterRecentTasks(suggestions, 'no match').length, 0)
})
test('selected-day filtering matches names/type/status, combines filters, and leaves source/totals untouched', () => {
  const rows = Object.freeze([
    original,
    row('Meet', '10:30', '11:00', { activityType: 'meeting', status: 'in_progress' }),
    row('Dev', '11:00', '12:00', { activityType: 'development', status: 'on_hold' }),
  ])
  const before = JSON.stringify(rows)
  assert.equal(filterActivities(rows, 'meeting', 'all').length, 1)
  assert.equal(filterActivities(rows, 'in progress', 'all')[0].id, 'Meet')
  assert.equal(filterActivities(rows, '', 'completed')[0].id, 'ABC')
  assert.equal(filterActivities(rows, 'jira', 'on_hold').length, 0)
  assert.equal(filterActivities(rows, 'no match', 'all').length, 0)
  assert.equal(JSON.stringify(rows), before)
})
