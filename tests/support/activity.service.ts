// Synthetic backend for isolated UI tests; excluded from normal development/builds.
import type {
  Activity,
  ActivityService,
  CreateActivityInput,
} from '../../src/features/activities/types/activity'
import { mockDays } from './activities.fixture'
import { combineDateAndTime } from '../../src/utils/date'
import { activityInputSchema } from '../../src/features/activities/validation/activity.schema'
import { calculateDurationMinutes } from '../../src/utils/duration'
import { sortActivities } from '../../src/features/activities/utils/activitySummary'
import { assertActivityCanSave } from '../../src/features/activities/domain/activityTime'

const storageKey = 'devtrack-e2e-activities'
const listeners = new Set<() => void>()
type StoredActivity = Omit<Activity, 'startAt' | 'endAt' | 'createdAt' | 'updatedAt'> & {
  startAt: string
  endAt: string
  createdAt: string | null
  updatedAt: string | null
}
function fixtures(): Activity[] {
  return Object.values(mockDays).flatMap((day) =>
    day.activities.map((a) => ({
      id: a.id,
      dateKey: a.dateKey,
      activityType: a.type,
      taskName: a.name.slice(0, 160),
      status: a.status,
      startAt: combineDateAndTime(a.dateKey, a.start),
      endAt: combineDateAndTime(a.dateKey, a.end),
      durationMinutes: a.durationMinutes,
      notes: a.notes,
      createdAt: new Date('2026-10-01T10:00:00Z'),
      updatedAt: null,
    })),
  )
}
function read(uid: string): Activity[] {
  const store = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<
    string,
    StoredActivity[]
  >
  const data = store[uid]
  return data
    ? data.map((a) => ({
        ...a,
        startAt: new Date(a.startAt),
        endAt: new Date(a.endAt),
        createdAt: a.createdAt ? new Date(a.createdAt) : null,
        updatedAt: a.updatedAt ? new Date(a.updatedAt) : null,
      }))
    : fixtures()
}
function write(uid: string, data: Activity[]) {
  const store = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<
    string,
    StoredActivity[]
  >
  localStorage.setItem(storageKey, JSON.stringify({ ...store, [uid]: data }))
  for (const callback of listeners) callback()
}
function options(): {
  readError?: string
  mutationError?: string
  delay?: number
  holdMutation?: boolean
} {
  return JSON.parse(localStorage.getItem('devtrack-e2e-activity-options') ?? '{}')
}
async function beforeMutation() {
  if (!navigator.onLine) throw { code: 'app/offline' }
  const { mutationError, delay = 50 } = options()
  const deadline = Date.now() + 15000
  while (options().holdMutation && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 25))
  await new Promise((resolve) => setTimeout(resolve, delay))
  if (mutationError) throw { code: mutationError }
}
function normalized(input: CreateActivityInput) {
  const data = activityInputSchema.parse(input)
  return { ...data, durationMinutes: calculateDurationMinutes(data.startAt, data.endAt) }
}
function subscribe(
  uid: string,
  start: string,
  end: string,
  next: (data: Activity[]) => void,
  error: (cause: unknown) => void,
) {
  let active = true
  const preview = new URLSearchParams(location.search).get('preview')
  const callback = () => {
    const problem = options().readError
    if (active) {
      if (problem) error({ code: problem })
      else next(sortActivities(read(uid).filter((a) => a.dateKey >= start && a.dateKey <= end)))
    }
  }
  listeners.add(callback)
  sessionStorage.setItem('devtrack-e2e-listeners', String(listeners.size))
  const timer = setTimeout(() => {
    if (!active || preview === 'loading') return
    callback()
  }, 20)
  return () => {
    active = false
    clearTimeout(timer)
    listeners.delete(callback)
    sessionStorage.setItem('devtrack-e2e-listeners', String(listeners.size))
  }
}
export const activityService: ActivityService = {
  async createActivity(uid, input) {
    await beforeMutation()
    assertActivityCanSave(activityInputSchema.parse(input), read(uid))
    const id = crypto.randomUUID(),
      now = new Date()
    write(uid, [...read(uid), { ...normalized(input), id, createdAt: now, updatedAt: now }])
    return id
  },
  async updateActivity(uid, id, input) {
    await beforeMutation()
    const activities = read(uid)
    assertActivityCanSave(activityInputSchema.parse(input), activities, id)
    if (!activities.some((a) => a.id === id)) throw { code: 'not-found' }
    write(
      uid,
      activities.map((a) =>
        a.id === id ? { ...a, ...normalized(input), updatedAt: new Date() } : a,
      ),
    )
  },
  async deleteActivity(uid, id) {
    await beforeMutation()
    write(
      uid,
      read(uid).filter((a) => a.id !== id),
    )
  },
  async getActivitiesByDate(uid, dateKey) {
    return sortActivities(read(uid).filter((a) => a.dateKey === dateKey))
  },
  async getActivitiesByDateRange(uid, start, end) {
    return sortActivities(read(uid).filter((a) => a.dateKey >= start && a.dateKey <= end))
  },
  subscribeToActivitiesByDate(uid, dateKey, next, error) {
    return subscribe(uid, dateKey, dateKey, next, error)
  },
  subscribeToActivitiesByRange(uid, start, end, next, error) {
    return subscribe(uid, start, end, next, error)
  },
}
