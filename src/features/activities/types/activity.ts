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
export interface Activity {
  id: string
  dateKey: string
  activityType: ActivityType
  taskName: string
  status: ActivityStatus
  startAt: Date
  endAt: Date
  durationMinutes: number
  notes: string
  createdAt: Date | null
  updatedAt: Date | null
}

export interface CreateActivityInput {
  dateKey: string
  activityType: ActivityType
  taskName: string
  status: ActivityStatus
  startAt: Date
  endAt: Date
  notes?: string
}
// Date is mutable: editing the date moves the activity between daily queries.
export type UpdateActivityInput = CreateActivityInput

export interface ActivityService {
  createActivity: (uid: string, input: CreateActivityInput) => Promise<string>
  updateActivity: (uid: string, id: string, input: UpdateActivityInput) => Promise<void>
  deleteActivity: (uid: string, id: string) => Promise<void>
  getActivitiesByDate: (uid: string, dateKey: string) => Promise<Activity[]>
  getActivitiesByDateRange: (uid: string, start: string, end: string) => Promise<Activity[]>
  subscribeToActivitiesByDate: (
    uid: string,
    dateKey: string,
    next: (data: Activity[]) => void,
    error: (cause: unknown) => void,
  ) => () => void
  subscribeToActivitiesByRange: (
    uid: string,
    start: string,
    end: string,
    next: (data: Activity[]) => void,
    error: (cause: unknown) => void,
  ) => () => void
}

export interface DaySummaryData {
  startTime: string | null
  endTime: string | null
  loggedMinutes: number
  workMinutes: number
  breakMinutes: number
}
