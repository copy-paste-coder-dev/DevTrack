import type { Activity, ActivityStatus, ActivityType } from '../types/activity.ts'
import type { UserPreferences } from '../../settings/types/preferences.ts'
import { buildCreateActivityDefaults, suggestEndTime } from './activityTime.ts'
import { getDefaultActivityType } from '../../settings/utils/activityTypeOptions.ts'
import { activityMeta, statusMeta } from '../config/presentation.ts'

export function buildDuplicateActivityDefaults({
  original,
  dateKey,
  activities,
  preferences,
}: {
  original: Activity
  dateKey: string
  activities: readonly Activity[]
  preferences: UserPreferences
}) {
  const defaults = buildCreateActivityDefaults({
    dateKey,
    activities,
    dayStartTime: preferences.dayStartTime,
  })
  return {
    ...defaults,
    type: preferences.enabledActivityTypes.includes(original.activityType)
      ? original.activityType
      : getDefaultActivityType(preferences.enabledActivityTypes),
    name: original.taskName,
    notes: original.notes,
    status: 'in_progress' as const,
    end:
      Number.isInteger(original.durationMinutes) && original.durationMinutes > 0
        ? suggestEndTime(defaults.start, original.durationMinutes)
        : '',
  }
}

export interface RecentTaskSuggestion {
  taskName: string
  activityType: ActivityType
  lastUsedAt: Date
}
export const RECENT_ACTIVITY_LIMIT = 30
const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

export function buildRecentTasks(
  activities: readonly Activity[],
  enabledTypes: readonly ActivityType[],
): RecentTaskSuggestion[] {
  const seen = new Set<string>()
  return [...activities]
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
    .flatMap((activity) => {
      const key = normalized(activity.taskName)
      if (!key || seen.has(key) || !enabledTypes.includes(activity.activityType)) return []
      seen.add(key)
      return [
        {
          taskName: activity.taskName.trim(),
          activityType: activity.activityType,
          lastUsedAt: activity.startAt,
        },
      ]
    })
}

export function filterRecentTasks(
  suggestions: readonly RecentTaskSuggestion[],
  search: string,
): RecentTaskSuggestion[] {
  const query = normalized(search)
  return suggestions.filter((item) => normalized(item.taskName).includes(query)).slice(0, 5)
}

export function filterActivities(
  activities: readonly Activity[],
  search: string,
  status: ActivityStatus | 'all',
): Activity[] {
  const query = normalized(search)
  return activities.filter(
    (activity) =>
      (status === 'all' || activity.status === status) &&
      normalized(
        `${activity.taskName} ${activityMeta[activity.activityType].label} ${statusMeta[activity.status].label}`,
      ).includes(query),
  )
}
