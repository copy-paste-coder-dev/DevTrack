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
// Persisted activity models will use Firestore Timestamps in a later phase.
