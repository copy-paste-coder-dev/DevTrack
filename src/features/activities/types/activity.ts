export const activityTypes = [
  'jira_task',
  'scrum_call',
  'meeting',
  'development',
  'bug_fix',
  'code_review',
  'testing',
  'break',
  'other',
] as const
export type ActivityType = (typeof activityTypes)[number]
export const activityStatuses = ['in_progress', 'on_hold', 'completed'] as const
export type ActivityStatus = (typeof activityStatuses)[number]
// Presentation model for Phase 1; persisted timestamps are a later concern.
export interface Activity {
  id: string
  dateKey: string
  type: ActivityType
  name: string
  status: ActivityStatus
  start: string
  end: string
  durationMinutes: number
  notes: string
}

export interface DaySummaryData {
  startTime: string | null
  endTime: string | null
  loggedMinutes: number
  remainingMinutes: number
  workMinutes: number
  goalMinutes: number
  breakMinutes: number
}
// Persisted activity models will use Firestore Timestamps in a later phase.
