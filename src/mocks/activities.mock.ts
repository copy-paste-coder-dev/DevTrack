import type { Activity, DaySummaryData } from '../features/activities/types/activity'

export const demoDateKey = '2026-10-12'
export interface MockDay {
  activities: Activity[]
  summary: DaySummaryData
  counts: { completed: number; inProgress: number; onHold: number }
}

const busyActivities: Activity[] = [
  {
    id: 'jira',
    dateKey: demoDateKey,
    type: 'jira_task',
    name: 'TD-10310 · Fix activity logging API',
    status: 'completed',
    start: '09:00',
    end: '10:30',
    durationMinutes: 90,
    notes: 'Updated API validation and reviewed edge cases.',
  },
  {
    id: 'scrum',
    dateKey: demoDateKey,
    type: 'scrum_call',
    name: 'Daily standup',
    status: 'completed',
    start: '10:30',
    end: '11:00',
    durationMinutes: 30,
    notes: '',
  },
  {
    id: 'dev',
    dateKey: demoDateKey,
    type: 'development',
    name: 'Build the dashboard interface',
    status: 'in_progress',
    start: '11:00',
    end: '13:00',
    durationMinutes: 120,
    notes: 'Working on the calendar and timeline UI.',
  },
  {
    id: 'break',
    dateKey: demoDateKey,
    type: 'break',
    name: 'Step away. Recharge.',
    status: 'completed',
    start: '13:00',
    end: '13:30',
    durationMinutes: 30,
    notes: '',
  },
  {
    id: 'meeting',
    dateKey: demoDateKey,
    type: 'meeting',
    name: 'Sprint planning with the team',
    status: 'completed',
    start: '13:30',
    end: '14:30',
    durationMinutes: 60,
    notes: '',
  },
  {
    id: 'review',
    dateKey: demoDateKey,
    type: 'code_review',
    name: 'Review authentication pull requests',
    status: 'on_hold',
    start: '14:30',
    end: '15:30',
    durationMinutes: 60,
    notes: 'Waiting for the latest changes.',
  },
]

export const mockDays: Record<string, MockDay> = {
  [demoDateKey]: {
    activities: busyActivities,
    summary: {
      startTime: '09:00',
      endTime: '15:30',
      loggedMinutes: 390,
      remainingMinutes: 120,
      workMinutes: 360,
      goalMinutes: 480,
      breakMinutes: 30,
    },
    counts: { completed: 4, inProgress: 1, onHold: 1 },
  },
  '2026-10-13': {
    activities: [
      {
        id: 'light-dev',
        dateKey: '2026-10-13',
        type: 'development',
        name: 'Polish the calendar keyboard experience',
        status: 'in_progress',
        start: '09:00',
        end: '10:00',
        durationMinutes: 60,
        notes: '',
      },
      {
        id: 'light-test',
        dateKey: '2026-10-13',
        type: 'testing',
        name: 'QA',
        status: 'completed',
        start: '10:00',
        end: '10:30',
        durationMinutes: 30,
        notes: 'Check the short-task layout.',
      },
    ],
    summary: {
      startTime: '09:00',
      endTime: '10:30',
      loggedMinutes: 90,
      remainingMinutes: 390,
      workMinutes: 90,
      goalMinutes: 480,
      breakMinutes: 0,
    },
    counts: { completed: 1, inProgress: 1, onHold: 0 },
  },
  '2026-10-09': {
    activities: [
      {
        id: 'long-dev',
        dateKey: '2026-10-09',
        type: 'development',
        name: 'Refactor the activity logging interface to support accessible keyboard navigation, reliable focus restoration, and responsive layouts across supported viewports',
        status: 'completed',
        start: '09:00',
        end: '17:00',
        durationMinutes: 480,
        notes: 'Long-name and eight-hour presentation scenario.',
      },
    ],
    summary: {
      startTime: '09:00',
      endTime: '17:00',
      loggedMinutes: 480,
      remainingMinutes: 0,
      workMinutes: 480,
      goalMinutes: 480,
      breakMinutes: 0,
    },
    counts: { completed: 1, inProgress: 0, onHold: 0 },
  },
}

const emptyDay: MockDay = {
  activities: [],
  summary: {
    startTime: null,
    endTime: null,
    loggedMinutes: 0,
    remainingMinutes: 480,
    workMinutes: 0,
    goalMinutes: 480,
    breakMinutes: 0,
  },
  counts: { completed: 0, inProgress: 0, onHold: 0 },
}

export function getMockDay(dateKey: string): MockDay {
  return mockDays[dateKey] ?? emptyDay
}
