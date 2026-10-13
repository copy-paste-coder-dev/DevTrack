export interface WorkdayPreferences {
  dayStartTime: string
}

// Phase 5 replaces this source with user preferences. Settings controls are still previews.
export const DEFAULT_WORKDAY_SETTINGS: Readonly<WorkdayPreferences> = {
  dayStartTime: '09:00',
}

export function getWorkdayPreferences(): Readonly<WorkdayPreferences> {
  return DEFAULT_WORKDAY_SETTINGS
}
