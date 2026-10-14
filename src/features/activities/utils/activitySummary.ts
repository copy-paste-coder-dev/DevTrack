import type { Activity } from '../types/activity.ts'
import { validateTimeRange } from '../domain/activityTime.ts'
export { sortActivities, getLatestEnd } from '../domain/activityTime.ts'
export const sumDurationMinutes = (activities: readonly Activity[]) =>
  activities.reduce((sum, item) => {
    if (
      Number.isInteger(item.durationMinutes) &&
      item.durationMinutes > 0 &&
      item.durationMinutes < 1440
    )
      return sum + item.durationMinutes
    const range = validateTimeRange(item.startAt, item.endAt, item.dateKey)
    return sum + (range.valid ? range.durationMinutes : 0)
  }, 0)
export function countActivitiesByStatus(activities: readonly Activity[]) {
  const counts = { completed: 0, inProgress: 0, onHold: 0 }
  for (const activity of activities) {
    if (activity.status === 'completed') counts.completed++
    if (activity.status === 'in_progress') counts.inProgress++
    if (activity.status === 'on_hold') counts.onHold++
  }
  return counts
}
export function getEarliestStart(activities: readonly Activity[]) {
  return activities.length
    ? new Date(Math.min(...activities.map((a) => a.startAt.getTime())))
    : null
}
