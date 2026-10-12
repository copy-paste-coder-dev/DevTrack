import { mockDays } from './activities.mock'
import { formatDuration } from '../utils/duration'

export const calendarActivityDates: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(mockDays).map(([date, day]) => [date, formatDuration(day.summary.loggedMinutes)]),
)
