import { activityTypes } from '../features/activities/types/activity'
import { DEFAULT_WORKDAY_SETTINGS } from '../features/settings/workdayPreferences'

export const mockSettings = {
  dayStart: DEFAULT_WORKDAY_SETTINGS.dayStartTime,
  dayEnd: '18:00',
  timeFormat: '24',
  enabledTypes: activityTypes,
} as const
