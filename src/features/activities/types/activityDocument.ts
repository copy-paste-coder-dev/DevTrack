import type { Timestamp } from 'firebase/firestore'
import type { ActivityType, ActivityStatus } from './activity'

export interface ActivityDocument {
  dateKey: string
  activityType: ActivityType
  taskName: string
  status: ActivityStatus
  startAt: Timestamp
  endAt: Timestamp
  durationMinutes: number
  notes: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
