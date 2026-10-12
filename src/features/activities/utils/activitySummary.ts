import type { Activity, DaySummaryData } from '../types/activity.ts'
import { formatDisplayTime } from '../../../utils/date.ts'

export const sortActivities = (activities: Activity[]) =>
  [...activities].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id),
  )
export const sumDurationMinutes = (activities: Activity[]) =>
  activities.reduce((sum, item) => sum + item.durationMinutes, 0)
export function countActivitiesByStatus(activities: Activity[]) {
  return {
    completed: activities.filter((a) => a.status === 'completed').length,
    inProgress: activities.filter((a) => a.status === 'in_progress').length,
    onHold: activities.filter((a) => a.status === 'on_hold').length,
  }
}
export function getEarliestStart(activities: Activity[]) {
  return activities.length
    ? new Date(Math.min(...activities.map((a) => a.startAt.getTime())))
    : null
}
export function getLatestEnd(activities: Activity[]) {
  return activities.length ? new Date(Math.max(...activities.map((a) => a.endAt.getTime()))) : null
}
export function getDaySummary(activities: Activity[]): DaySummaryData {
  const start = getEarliestStart(activities),
    end = getLatestEnd(activities)
  const loggedMinutes = sumDurationMinutes(activities)
  const breakMinutes = sumDurationMinutes(activities.filter((a) => a.activityType === 'break'))
  return {
    startTime: start ? formatDisplayTime(start) : null,
    endTime: end ? formatDisplayTime(end) : null,
    loggedMinutes,
    breakMinutes,
    workMinutes: loggedMinutes - breakMinutes,
  }
}
export function getActivityDates(activities: Activity[]) {
  const counts: Record<string, string> = {}
  for (const activity of activities)
    counts[activity.dateKey] = String(Number(counts[activity.dateKey] ?? 0) + 1)
  return counts
}
