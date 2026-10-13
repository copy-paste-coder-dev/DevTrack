import type { ActivityType } from '../../activities/types/activity.ts'

export type TimeFormat = '12h' | '24h'
export interface UserPreferences {
  dayStartTime: string
  dayEndTime: string
  timeFormat: TimeFormat
  enabledActivityTypes: ActivityType[]
}
export type UpdateUserPreferencesInput = UserPreferences
export interface SettingsService {
  getUserPreferences: (uid: string) => Promise<UserPreferences | null>
  createDefaultUserPreferences: (uid: string) => Promise<void>
  updateUserPreferences: (
    uid: string,
    input: UpdateUserPreferencesInput,
  ) => Promise<UserPreferences>
  subscribeToUserPreferences: (
    uid: string,
    next: (preferences: UserPreferences | null) => void,
    error: (cause: unknown) => void,
  ) => () => void
}
