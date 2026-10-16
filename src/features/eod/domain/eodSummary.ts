import type { Activity } from '../../activities/types/activity.ts'
import { activityTypes } from '../../activities/types/activity.ts'
import { sortActivities, validateTimeRange } from '../../activities/domain/activityTime.ts'
import { sumDurationMinutes } from '../../activities/utils/activitySummary.ts'
import type { DailyAnalysis } from '../../analytics/types/analytics.ts'
import type { EodActivityTypeBreakdown, EodSummary, EodTaskGroup } from '../types/eod.types.ts'

export const normalizeTaskName = (name: string): string =>
  name.trim().replace(/\s+/gu, ' ').toLowerCase()

// First session supplies display spelling; ties use the existing activity ID ordering.
export function groupActivitiesIntoWorkItems(activities: readonly Activity[]): EodTaskGroup[] {
  const groups = new Map<string, EodTaskGroup>()
  for (const activity of sortActivities(activities)) {
    const key = JSON.stringify([activity.activityType, normalizeTaskName(activity.taskName)])
    const session = {
      activityId: activity.id,
      startAt: new Date(activity.startAt),
      endAt: new Date(activity.endAt),
      durationMinutes: sumDurationMinutes([activity]),
      status: activity.status,
      notes: activity.notes || undefined,
    }
    const group = groups.get(key)
    if (group) {
      group.sessions.push(session)
      group.sessionCount++
      group.totalDurationMinutes += session.durationMinutes
      group.finalStatus = session.status
      group.lastEndAt = new Date(Math.max(group.lastEndAt.getTime(), session.endAt.getTime()))
    } else {
      groups.set(key, {
        key,
        taskName: activity.taskName,
        activityType: activity.activityType,
        sessions: [session],
        sessionCount: 1,
        totalDurationMinutes: session.durationMinutes,
        finalStatus: session.status,
        firstStartAt: new Date(session.startAt),
        lastEndAt: new Date(session.endAt),
      })
    }
  }
  return [...groups.values()]
}

export function buildActivityTypeBreakdown(
  groups: readonly EodTaskGroup[],
): EodActivityTypeBreakdown[] {
  const total = groups.reduce((sum, group) => sum + group.totalDurationMinutes, 0)
  return activityTypes.flatMap((activityType) => {
    const matching = groups.filter((group) => group.activityType === activityType)
    if (!matching.length) return []
    const minutes = matching.reduce((sum, group) => sum + group.totalDurationMinutes, 0)
    return [
      {
        activityType,
        activityCount: matching.reduce((sum, group) => sum + group.sessionCount, 0),
        uniqueTaskCount: matching.length,
        totalDurationMinutes: minutes,
        percentageOfLoggedTime: total > 0 ? (minutes / total) * 100 : 0,
      },
    ]
  })
}

export function buildEodSummary({
  dateKey,
  activities,
  dailyAnalysis: day,
}: {
  dateKey: string
  activities: readonly Activity[]
  dailyAnalysis: DailyAnalysis
}): EodSummary {
  if (day.dateKey !== dateKey) throw new Error('EOD analysis must match the selected date.')
  // Mirror the canonical analysis interval policy; never introduce a second duration or gap policy.
  const valid = activities.filter(
    (a) => a.dateKey === dateKey && validateTimeRange(a.startAt, a.endAt, dateKey).valid,
  )
  const groups = groupActivitiesIntoWorkItems(valid)
  return {
    dateKey,
    activitySessionCount: valid.length,
    invalidActivityCount: day.invalidActivityCount,
    uniqueWorkItemCount: groups.length,
    totalLoggedMinutes: day.totalLoggedMinutes,
    workdayTargetMinutes: day.workdayTargetMinutes,
    remainingMinutes: day.remainingTargetMinutes,
    overtimeMinutes: day.overtimeMinutes,
    progressPercent: day.progressPercent,
    actualStart: day.actualStart,
    actualEnd: day.actualEnd,
    configuredStartTime: day.configuredStartTime,
    configuredEndTime: day.configuredEndTime,
    completedGroups: groups.filter((g) => g.finalStatus === 'completed'),
    inProgressGroups: groups.filter((g) => g.finalStatus === 'in_progress'),
    onHoldGroups: groups.filter((g) => g.finalStatus === 'on_hold'),
    activityTypeBreakdown: buildActivityTypeBreakdown(groups),
    gaps: day.gaps,
    totalGapMinutes: day.gapMinutes,
    gapCount: day.gapCount,
  }
}
