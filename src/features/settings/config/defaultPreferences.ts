import { activityTypes } from '../../activities/types/activity.ts'
import type { UserPreferences } from '../types/preferences.ts'

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  dayStartTime: '09:00',
  dayEndTime: '18:00',
  timeFormat: '24h',
  enabledActivityTypes: [...activityTypes],
}

export function getDefaultUserPreferences(): UserPreferences {
  return {
    ...DEFAULT_USER_PREFERENCES,
    enabledActivityTypes: [...DEFAULT_USER_PREFERENCES.enabledActivityTypes],
  }
}
