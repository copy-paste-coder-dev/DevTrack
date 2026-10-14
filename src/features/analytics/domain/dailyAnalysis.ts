import type { Activity } from '../../activities/types/activity.ts'
import type { UserPreferences } from '../../settings/types/preferences.ts'
import type { DailyAnalysis } from '../types/analytics.ts'
import { detectActivityGaps, validateTimeRange } from '../../activities/domain/activityTime.ts'
import {
  countActivitiesByStatus,
  getEarliestStart,
  getLatestEnd,
  sumDurationMinutes,
} from '../../activities/utils/activitySummary.ts'
import {
  calculateRemainingWorkMinutes,
  calculateWorkdayMinutes,
  calculateWorkdayProgress,
} from '../../settings/utils/workday.ts'
import { isDateKey, toDateKey } from '../../../utils/date.ts'

export function analyzeDay({
  dateKey,
  activities,
  preferences,
  now = new Date(),
}: {
  dateKey: string
  activities: readonly Activity[]
  preferences: UserPreferences
  now?: Date
}): DailyAnalysis {
  if (!isDateKey(dateKey)) throw new Error('Choose a valid local date.')
  const candidates = activities.filter((activity) => activity.dateKey === dateKey)
  // Invalid intervals are excluded. Valid intervals with malformed persisted durations
  // fall back to timestamps in sumDurationMinutes; valid stored durations remain authoritative.
  const valid = candidates.filter(
    (activity) => validateTimeRange(activity.startAt, activity.endAt, dateKey).valid,
  )
  const totalLoggedMinutes = sumDurationMinutes(valid)
  const counts = countActivitiesByStatus(valid)
  let workdayTargetMinutes = 0
  try {
    workdayTargetMinutes = calculateWorkdayMinutes(preferences.dayStartTime, preferences.dayEndTime)
  } catch {
    // Validated preferences normally prevent this; corrupt/zero targets must stay finite.
  }
  const remainingTargetMinutes =
    workdayTargetMinutes > 0
      ? calculateRemainingWorkMinutes({ ...preferences, totalLoggedMinutes })
      : 0
  let gaps: DailyAnalysis['gaps']
  try {
    gaps = detectActivityGaps(dateKey, valid, preferences.dayStartTime)
  } catch {
    // A nonexistent configured local time (DST) still allows internal gap analysis.
    gaps = detectActivityGaps(dateKey, valid)
  }
  const todayKey = toDateKey(now)
  const isFuture = dateKey > todayKey
  const hasActivities = valid.length > 0
  const isTargetMet = workdayTargetMinutes > 0 && totalLoggedMinutes >= workdayTargetMinutes
  const isOverTarget = workdayTargetMinutes > 0 && totalLoggedMinutes > workdayTargetMinutes
  return {
    dateKey,
    activityCount: valid.length,
    invalidActivityCount: candidates.length - valid.length,
    totalLoggedMinutes,
    completedCount: counts.completed,
    inProgressCount: counts.inProgress,
    onHoldCount: counts.onHold,
    openCount: counts.inProgress + counts.onHold,
    actualStart: getEarliestStart(valid),
    actualEnd: getLatestEnd(valid),
    configuredStartTime: preferences.dayStartTime,
    configuredEndTime: preferences.dayEndTime,
    workdayTargetMinutes,
    remainingTargetMinutes,
    scheduledUnloggedMinutes: remainingTargetMinutes,
    overtimeMinutes:
      workdayTargetMinutes > 0 ? Math.max(totalLoggedMinutes - workdayTargetMinutes, 0) : 0,
    completionPercent:
      workdayTargetMinutes > 0 ? (totalLoggedMinutes / workdayTargetMinutes) * 100 : 0,
    progressPercent: calculateWorkdayProgress(totalLoggedMinutes, workdayTargetMinutes),
    gapMinutes: gaps.reduce((sum, gap) => sum + gap.durationMinutes, 0),
    gapCount: gaps.length,
    gaps,
    hasActivities,
    isEmpty: !hasActivities,
    isTargetMet,
    isOverTarget,
    isToday: dateKey === todayKey,
    isFuture,
    dayState: isFuture
      ? 'future'
      : !hasActivities
        ? 'empty'
        : isOverTarget
          ? 'over_target'
          : isTargetMet
            ? 'target_met'
            : 'partial',
  }
}

export function getDayStateLabel(
  day: Pick<DailyAnalysis, 'dayState' | 'isToday' | 'hasActivities'>,
): string {
  if (day.dayState === 'future') return day.hasActivities ? 'Future · Logged' : 'Future'
  const label = {
    empty: 'No activity',
    partial: day.isToday ? 'In progress' : 'Partial',
    target_met: 'Target met',
    over_target: 'Over target',
  }[day.dayState]
  return `${day.isToday ? 'Today' : 'Past'} · ${label}`
}
