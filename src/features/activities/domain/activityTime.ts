import type { Activity, CreateActivityInput } from '../types/activity.ts'
import { combineDateAndTime, formatDisplayTime, isDateKey, toDateKey } from '../../../utils/date.ts'

export type TimeRangeResult =
  { valid: true; durationMinutes: number } | { valid: false; message: string }

export class ActivityTimeError extends Error {
  readonly code = 'app/activity-time'
  constructor(message: string) {
    super(message)
    this.name = 'ActivityTimeError'
  }
}

export function validateTimeRange(
  startAt: Date,
  endAt: Date,
  dateKey?: string,
  minutePrecision = false,
): TimeRangeResult {
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()))
    return { valid: false, message: 'Choose valid start and end times.' }
  const day = dateKey ?? toDateKey(startAt)
  if (!isDateKey(day) || toDateKey(startAt) !== day || toDateKey(endAt) !== day)
    return { valid: false, message: 'Times must belong to the selected day.' }
  if (
    minutePrecision &&
    [startAt, endAt].some((date) => date.getSeconds() !== 0 || date.getMilliseconds() !== 0)
  )
    return { valid: false, message: 'Use minute precision for start and end times.' }
  const elapsed = (endAt.getTime() - startAt.getTime()) / 60000
  if (elapsed < 1) return { valid: false, message: 'End time must be after start time.' }
  if (elapsed >= 1440) return { valid: false, message: 'Activities must be shorter than 24 hours.' }
  return { valid: true, durationMinutes: Math.round(elapsed) }
}

export function calculateDurationMinutes(startAt: Date, endAt: Date): number {
  const result = validateTimeRange(startAt, endAt)
  if (!result.valid) throw new ActivityTimeError(result.message)
  return result.durationMinutes
}

export function parseTimeRange(dateKey: string, start: string, end: string) {
  try {
    const startAt = combineDateAndTime(dateKey, start)
    const endAt = combineDateAndTime(dateKey, end)
    return { ...validateTimeRange(startAt, endAt, dateKey), startAt, endAt }
  } catch {
    return { valid: false as const, message: 'Choose a valid date and local time.' }
  }
}

export function sortActivities(activities: readonly Activity[]): Activity[] {
  return [...activities].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id),
  )
}

export function getLatestEnd(activities: readonly Activity[]): Date | null {
  return activities.length ? new Date(Math.max(...activities.map((a) => a.endAt.getTime()))) : null
}

export function getSuggestedActivityStartTime(
  selectedDateKey: string,
  activities: readonly Activity[],
  configuredDayStartTime: string,
): string {
  const latest = getLatestEnd(activities.filter((a) => a.dateKey === selectedDateKey))
  if (!latest) return configuredDayStartTime
  const nextMinute = new Date(Math.ceil(latest.getTime() / 60000) * 60000)
  return toDateKey(nextMinute) === selectedDateKey ? formatDisplayTime(nextMinute) : ''
}

// Wall-clock addition never wraps into a different day. Near midnight the end stays blank.
export function suggestEndTime(start: string, minutes = 30): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) return ''
  const [hours, minute] = start.split(':').map(Number)
  const end = hours! * 60 + minute! + minutes
  if (end >= 1440 || end < 0) return ''
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
}

export function findOverlappingActivity(
  candidate: Pick<CreateActivityInput, 'dateKey' | 'startAt' | 'endAt'>,
  activities: readonly Activity[],
  excludeActivityId?: string,
): Activity | undefined {
  return sortActivities(activities).find(
    (a) =>
      a.id !== excludeActivityId &&
      a.dateKey === candidate.dateKey &&
      candidate.startAt < a.endAt &&
      candidate.endAt > a.startAt,
  )
}

export function describeActivityConflict(activity: Activity): string {
  return `Conflicts with “${activity.taskName || 'Existing activity'}” (${formatDisplayTime(activity.startAt)}–${formatDisplayTime(activity.endAt)}). Choose a different start or end time.`
}

export function assertActivityCanSave(
  candidate: CreateActivityInput,
  activities: readonly Activity[],
  excludeActivityId?: string,
): void {
  const range = validateTimeRange(candidate.startAt, candidate.endAt, candidate.dateKey)
  if (!range.valid) throw new ActivityTimeError(range.message)
  const conflict = findOverlappingActivity(candidate, activities, excludeActivityId)
  if (conflict) throw new ActivityTimeError(describeActivityConflict(conflict))
}

export interface ActivityGap {
  dateKey: string
  startAt: Date
  endAt: Date
  durationMinutes: number
}
export const GAP_DISPLAY_THRESHOLD_MINUTES = 1

export function detectActivityGaps(
  dateKey: string,
  activities: readonly Activity[],
  dayStartTime?: string,
): ActivityGap[] {
  const gaps: ActivityGap[] = []
  let cursor = dayStartTime ? combineDateAndTime(dateKey, dayStartTime).getTime() : undefined
  for (const activity of sortActivities(activities.filter((a) => a.dateKey === dateKey))) {
    // Round gap boundaries inward so minute-precision gap filling never includes occupied seconds.
    const start = Math.floor(activity.startAt.getTime() / 60000) * 60000
    const end = Math.ceil(activity.endAt.getTime() / 60000) * 60000
    if (cursor !== undefined && start - cursor >= 60000)
      gaps.push({
        dateKey,
        startAt: new Date(cursor),
        endAt: new Date(start),
        durationMinutes: (start - cursor) / 60000,
      })
    cursor = Math.max(cursor ?? end, end)
  }
  return gaps
}

export function buildCreateActivityDefaults({
  dateKey,
  activities,
  dayStartTime,
  gap,
}: {
  dateKey: string
  activities: readonly Activity[]
  dayStartTime: string
  gap?: ActivityGap
}) {
  const start = gap
    ? formatDisplayTime(gap.startAt)
    : getSuggestedActivityStartTime(dateKey, activities, dayStartTime)
  return {
    date: dateKey,
    type: 'development' as const,
    name: '',
    status: 'in_progress' as const,
    start,
    end: gap ? formatDisplayTime(gap.endAt) : suggestEndTime(start),
    notes: '',
  }
}
