import {
  Bug,
  Code2,
  Coffee,
  GitPullRequest,
  ListTodo,
  MessagesSquare,
  MoreHorizontal,
  TestTube2,
  Users,
} from 'lucide-react'
import type { ActivityStatus, ActivityType } from '../types/activity'

export const demoDateKey = '2026-10-12'
export const activityMeta = {
  jira_task: { label: 'Jira Task', icon: ListTodo, color: 'cyan' },
  scrum_call: { label: 'Scrum Call', icon: MessagesSquare, color: 'purple' },
  meeting: { label: 'Meeting', icon: Users, color: 'purple' },
  development: { label: 'Development', icon: Code2, color: 'blue' },
  bug_fix: { label: 'Bug Fix', icon: Bug, color: 'pink' },
  code_review: { label: 'Code Review', icon: GitPullRequest, color: 'pink' },
  testing: { label: 'Testing', icon: TestTube2, color: 'green' },
  break: { label: 'Break', icon: Coffee, color: 'amber' },
  other: { label: 'Other', icon: MoreHorizontal, color: 'slate' },
} as const
export const statusMeta = {
  completed: { label: 'Completed', className: 'status-completed' },
  in_progress: { label: 'In progress', className: 'status-progress' },
  on_hold: { label: 'On hold', className: 'status-hold' },
} as const

// UI fixtures only, not a persisted activity model or computed reports.
export interface DemoActivity {
  id: string
  type: ActivityType
  name: string
  status: ActivityStatus
  start: string
  end: string
  duration: string
  notes: string
}
export const demoActivities: DemoActivity[] = [
  {
    id: 'jira',
    type: 'jira_task',
    name: 'TD-10310 · Fix activity logging API',
    status: 'completed',
    start: '09:00',
    end: '10:30',
    duration: '1h 30m',
    notes: 'Updated API validation and reviewed edge cases.',
  },
  {
    id: 'scrum',
    type: 'scrum_call',
    name: 'Daily standup',
    status: 'completed',
    start: '10:30',
    end: '11:00',
    duration: '30m',
    notes: '',
  },
  {
    id: 'dev',
    type: 'development',
    name: 'Build the dashboard interface',
    status: 'in_progress',
    start: '11:00',
    end: '13:00',
    duration: '2h',
    notes: 'Working on the calendar and timeline UI.',
  },
  {
    id: 'break',
    type: 'break',
    name: 'Step away. Recharge.',
    status: 'completed',
    start: '13:00',
    end: '13:30',
    duration: '30m',
    notes: '',
  },
  {
    id: 'meeting',
    type: 'meeting',
    name: 'Sprint planning with the team',
    status: 'completed',
    start: '13:30',
    end: '14:30',
    duration: '1h',
    notes: '',
  },
  {
    id: 'review',
    type: 'code_review',
    name: 'Review authentication pull requests',
    status: 'on_hold',
    start: '14:30',
    end: '15:30',
    duration: '1h',
    notes: 'Waiting for the latest changes.',
  },
]
export const fixtureDays = new Set([demoDateKey, '2026-10-09', '2026-10-13'])
export function getDemoActivities(dateKey: string) {
  return fixtureDays.has(dateKey) ? demoActivities : []
}
