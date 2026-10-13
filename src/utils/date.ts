import { format, startOfMonth, endOfMonth } from 'date-fns'
export const formatDisplayDate = (date: Date) => format(date, 'EEEE, MMMM d, yyyy')
export const formatDisplayTime = (date: Date) => format(date, 'HH:mm')
export const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd')
export const isTimeString = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

export function timeToMinutes(value: string): number {
  if (!isTimeString(value)) throw new Error('Choose a valid time.')
  const [hours, minutes] = value.split(':').map(Number)
  return hours! * 60 + minutes!
}

export function combineDateAndTime(dateKey: string, time: string): Date {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(dateKey) || !isTimeString(time))
    throw new Error('Choose a valid date and time.')
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(year!, month! - 1, day!, hours!, minutes!)
  if (toDateKey(result) !== dateKey || formatDisplayTime(result) !== time)
    throw new Error('This date or local time does not exist.')
  return result
}

export function isDateKey(value: string): boolean {
  try {
    combineDateAndTime(value, '12:00')
    return true
  } catch {
    return false
  }
}

export function getMonthDateRange(date: Date) {
  return { startDateKey: toDateKey(startOfMonth(date)), endDateKey: toDateKey(endOfMonth(date)) }
}
