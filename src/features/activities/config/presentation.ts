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

export const activityMeta = {
  jira_task: { label: 'Jira Task', icon: ListTodo, color: 'cyan' },
  scrum_call: { label: 'Scrum Call', icon: MessagesSquare, color: 'purple' },
  meeting: { label: 'Meeting', icon: Users, color: 'purple' },
  development: { label: 'Development', icon: Code2, color: 'cyan' },
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
