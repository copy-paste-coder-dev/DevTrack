import { format, parseISO } from 'date-fns'
import type { EodSummary } from '../types/eod.types.ts'
import type { UserPreferences } from '../../settings/types/preferences.ts'
import { formatTime, formatTimeString } from '../../settings/utils/timeFormat.ts'
import { formatDuration } from '../../../utils/duration.ts'

// Plain domain labels keep export generation independent of icon/UI modules.
export const eodTypeLabels = {
  jira_task: 'Jira Task',
  scrum_call: 'Scrum Call',
  meeting: 'Meeting',
  development: 'Development',
  bug_fix: 'Bug Fix',
  code_review: 'Code Review',
  testing: 'Testing',
  break: 'Break',
  other: 'Other',
} as const
export const eodStatusLabels = {
  completed: 'Completed',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
} as const
const singleLine = (value: string) => value.replace(/\s+/gu, ' ').trim()
export const eodSections = (summary: EodSummary) =>
  [
    { label: 'Completed', groups: summary.completedGroups },
    { label: 'In Progress', groups: summary.inProgressGroups },
    { label: 'On Hold', groups: summary.onHoldGroups },
  ].filter((section) => section.groups.length)

export function buildCompactEodText(summary: EodSummary, preferences: UserPreferences): string {
  // Compact output intentionally has no clock times; the API matches Detailed Text.
  void preferences
  const lines = [`EOD Summary — ${format(parseISO(summary.dateKey), 'MMM d, yyyy')}`, '']
  if (!summary.activitySessionCount)
    return [...lines, 'No activities were logged for this day.'].join('\n')
  lines.push(
    `Logged: ${formatDuration(summary.totalLoggedMinutes)} / ${formatDuration(summary.workdayTargetMinutes)}`,
  )
  if (summary.overtimeMinutes) lines.push(`Overtime: ${formatDuration(summary.overtimeMinutes)}`)
  for (const section of eodSections(summary)) {
    lines.push(
      '',
      `${section.label}:`,
      ...section.groups.map(
        (group) =>
          `• ${singleLine(group.taskName)} — ${formatDuration(group.totalDurationMinutes)}`,
      ),
    )
  }
  lines.push('', `Unlogged: ${formatDuration(summary.totalGapMinutes)}`)
  return lines.join('\n')
}

export function buildDetailedEodText(summary: EodSummary, preferences: UserPreferences): string {
  const lines = [`EOD Summary — ${format(parseISO(summary.dateKey), 'MMMM d, yyyy')}`, '']
  if (!summary.activitySessionCount)
    return [...lines, 'No activities were logged for this day.'].join('\n')
  const time = (date: Date | null) => (date ? formatTime(date, preferences.timeFormat) : '—')
  lines.push(
    'Workday',
    `Configured: ${formatTimeString(summary.configuredStartTime, preferences.timeFormat)}–${formatTimeString(summary.configuredEndTime, preferences.timeFormat)}`,
    `Actual: ${time(summary.actualStart)}–${time(summary.actualEnd)}`,
    `Logged: ${formatDuration(summary.totalLoggedMinutes)}`,
    `Target: ${formatDuration(summary.workdayTargetMinutes)}`,
    summary.overtimeMinutes
      ? `Overtime: ${formatDuration(summary.overtimeMinutes)}`
      : `Remaining: ${formatDuration(summary.remainingMinutes)}`,
    `Sessions: ${summary.activitySessionCount}`,
    `Unique Work Items: ${summary.uniqueWorkItemCount}`,
  )
  for (const section of eodSections(summary)) {
    lines.push('', section.label)
    for (const group of section.groups) {
      lines.push(
        '',
        singleLine(group.taskName),
        `Type: ${eodTypeLabels[group.activityType]}`,
        `Final Status: ${eodStatusLabels[group.finalStatus]}`,
        `Total: ${formatDuration(group.totalDurationMinutes)}`,
        `Sessions: ${group.sessionCount}`,
        '',
      )
      for (const session of group.sessions) {
        lines.push(
          `  ${time(session.startAt)}–${time(session.endAt)} — ${formatDuration(session.durationMinutes)} · ${eodStatusLabels[session.status]}`,
        )
        if (session.notes?.trim()) lines.push(`    Notes: ${singleLine(session.notes)}`)
      }
    }
  }
  lines.push('', 'Activity Type Breakdown')
  for (const item of summary.activityTypeBreakdown)
    lines.push(
      `${eodTypeLabels[item.activityType]}: ${formatDuration(item.totalDurationMinutes)} · ${item.activityCount} sessions · ${item.uniqueTaskCount} work items · ${item.percentageOfLoggedTime.toFixed(1)}%`,
    )
  lines.push('', 'Unlogged Gaps')
  if (!summary.gaps.length) lines.push('No unlogged gaps.')
  for (const gap of summary.gaps)
    lines.push(`${time(gap.startAt)}–${time(gap.endAt)} — ${formatDuration(gap.durationMinutes)}`)
  lines.push(`Total Unlogged: ${formatDuration(summary.totalGapMinutes)}`)
  return lines.join('\n')
}
