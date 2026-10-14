import type { ActivityGap } from '../../activities/domain/activityTime.ts'

export type DayState = 'empty' | 'partial' | 'target_met' | 'over_target' | 'future'

export interface DailyAnalysis {
  dateKey: string
  activityCount: number
  invalidActivityCount: number
  totalLoggedMinutes: number
  completedCount: number
  inProgressCount: number
  onHoldCount: number
  openCount: number
  actualStart: Date | null
  actualEnd: Date | null
  configuredStartTime: string
  configuredEndTime: string
  workdayTargetMinutes: number
  remainingTargetMinutes: number
  scheduledUnloggedMinutes: number
  overtimeMinutes: number
  completionPercent: number
  progressPercent: number
  gapMinutes: number
  gapCount: number
  gaps: ActivityGap[]
  hasActivities: boolean
  isEmpty: boolean
  isTargetMet: boolean
  isOverTarget: boolean
  isToday: boolean
  isFuture: boolean
  dayState: DayState
}

export interface MonthAnalysis {
  monthKey: string
  totalActivities: number
  totalLoggedMinutes: number
  activeDayCount: number
  targetMetDayCount: number
  partialDayCount: number
  totalGapMinutes: number
  totalGapCount: number
  completedActivityCount: number
  inProgressActivityCount: number
  onHoldActivityCount: number
  averageLoggedMinutesPerActiveDay: number
  days: Readonly<Record<string, DailyAnalysis>>
}

export interface CalendarDayMeta {
  dateKey: string
  activityCount: number
  loggedMinutes: number
  completionPercent: number
  state: DayState
  completedCount: number
  hasGap: boolean
  isToday: boolean
  isSelected: boolean
  isFuture: boolean
}
