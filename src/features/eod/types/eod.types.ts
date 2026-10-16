import type { ActivityStatus, ActivityType } from '../../activities/types/activity.ts'
import type { ActivityGap } from '../../activities/domain/activityTime.ts'

export interface EodSession {
  activityId: string
  startAt: Date
  endAt: Date
  durationMinutes: number
  status: ActivityStatus
  notes?: string
}
export interface EodTaskGroup {
  key: string
  taskName: string
  activityType: ActivityType
  sessions: EodSession[]
  sessionCount: number
  totalDurationMinutes: number
  finalStatus: ActivityStatus
  firstStartAt: Date
  lastEndAt: Date
}
export interface EodActivityTypeBreakdown {
  activityType: ActivityType
  activityCount: number
  uniqueTaskCount: number
  totalDurationMinutes: number
  percentageOfLoggedTime: number
}
export interface EodSummary {
  dateKey: string
  activitySessionCount: number
  invalidActivityCount: number
  uniqueWorkItemCount: number
  totalLoggedMinutes: number
  workdayTargetMinutes: number
  remainingMinutes: number
  overtimeMinutes: number
  progressPercent: number
  actualStart: Date | null
  actualEnd: Date | null
  configuredStartTime: string
  configuredEndTime: string
  completedGroups: EodTaskGroup[]
  inProgressGroups: EodTaskGroup[]
  onHoldGroups: EodTaskGroup[]
  activityTypeBreakdown: EodActivityTypeBreakdown[]
  gaps: ActivityGap[]
  totalGapMinutes: number
  gapCount: number
}
