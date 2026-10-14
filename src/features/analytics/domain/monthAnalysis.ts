import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns'
import type { Activity } from '../../activities/types/activity.ts'
import type { UserPreferences } from '../../settings/types/preferences.ts'
import type { MonthAnalysis, CalendarDayMeta, DailyAnalysis } from '../types/analytics.ts'
import { toDateKey } from '../../../utils/date.ts'
import { analyzeDay } from './dailyAnalysis.ts'

export function groupActivitiesByDate(activities: readonly Activity[]): Map<string, Activity[]> {
  const groups = new Map<string, Activity[]>()
  for (const activity of activities) {
    const group = groups.get(activity.dateKey)
    if (group) group.push(activity)
    else groups.set(activity.dateKey, [activity])
  }
  return groups
}

export function buildMonthAnalysis({
  month,
  activities,
  preferences,
  now = new Date(),
}: {
  month: Date
  activities: readonly Activity[]
  preferences: UserPreferences
  now?: Date
}): MonthAnalysis {
  const groups = groupActivitiesByDate(activities)
  const days: Record<string, DailyAnalysis> = {}
  const result: MonthAnalysis = {
    monthKey: format(month, 'yyyy-MM'),
    totalActivities: 0,
    totalLoggedMinutes: 0,
    activeDayCount: 0,
    targetMetDayCount: 0,
    partialDayCount: 0,
    totalGapMinutes: 0,
    totalGapCount: 0,
    completedActivityCount: 0,
    inProgressActivityCount: 0,
    onHoldActivityCount: 0,
    averageLoggedMinutesPerActiveDay: 0,
    days,
  }
  for (const date of eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })) {
    const dateKey = toDateKey(date)
    const day = analyzeDay({ dateKey, activities: groups.get(dateKey) ?? [], preferences, now })
    days[dateKey] = day
    result.totalActivities += day.activityCount
    result.totalLoggedMinutes += day.totalLoggedMinutes
    result.activeDayCount += Number(day.hasActivities)
    // Future logs contribute to logged totals, but never count as a completed historical day.
    result.targetMetDayCount += Number(!day.isFuture && day.isTargetMet)
    result.partialDayCount += Number(day.dayState === 'partial')
    result.totalGapMinutes += day.gapMinutes
    result.totalGapCount += day.gapCount
    result.completedActivityCount += day.completedCount
    result.inProgressActivityCount += day.inProgressCount
    result.onHoldActivityCount += day.onHoldCount
  }
  result.averageLoggedMinutesPerActiveDay = result.activeDayCount
    ? result.totalLoggedMinutes / result.activeDayCount
    : 0
  return result
}

export function getCalendarDayMeta(
  dateKey: string,
  selectedDateKey: string,
  todayKey: string,
  analysis?: DailyAnalysis,
): CalendarDayMeta {
  return {
    dateKey,
    activityCount: analysis?.activityCount ?? 0,
    loggedMinutes: analysis?.totalLoggedMinutes ?? 0,
    completionPercent: analysis?.completionPercent ?? 0,
    state: analysis?.dayState ?? (dateKey > todayKey ? 'future' : 'empty'),
    completedCount: analysis?.completedCount ?? 0,
    hasGap: Boolean(analysis?.gapCount),
    isToday: dateKey === todayKey,
    isSelected: dateKey === selectedDateKey,
    isFuture: dateKey > todayKey,
  }
}
