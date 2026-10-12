import { activityTypes } from '../features/activities/types/activity'

export const mockSettings = {
  dayStart: '09:00',
  dayEnd: '18:00',
  timeFormat: '24',
  enabledTypes: activityTypes,
} as const
