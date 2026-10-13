import { timeToMinutes } from '../../../utils/date.ts'

export function calculateWorkdayMinutes(dayStartTime: string, dayEndTime: string): number {
  const minutes = timeToMinutes(dayEndTime) - timeToMinutes(dayStartTime)
  if (minutes <= 0) throw new Error('End time must be later than start time.')
  return minutes
}

export function calculateRemainingWorkMinutes({
  totalLoggedMinutes,
  dayStartTime,
  dayEndTime,
}: {
  totalLoggedMinutes: number
  dayStartTime: string
  dayEndTime: string
}): number {
  return Math.max(calculateWorkdayMinutes(dayStartTime, dayEndTime) - totalLoggedMinutes, 0)
}

export function calculateWorkdayProgress(loggedMinutes: number, workdayMinutes: number): number {
  return Math.min(100, Math.max(0, (loggedMinutes / workdayMinutes) * 100))
}
