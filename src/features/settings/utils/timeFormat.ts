import { formatDisplayTime, timeToMinutes } from '../../../utils/date.ts'
import type { TimeFormat } from '../types/preferences.ts'

export function formatTimeString(time: string, timeFormat: TimeFormat): string {
  const minutes = timeToMinutes(time)
  if (timeFormat === '24h') return time
  const hour = Math.floor(minutes / 60)
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}
export function formatTime(date: Date, timeFormat: TimeFormat): string {
  return formatTimeString(formatDisplayTime(date), timeFormat)
}
