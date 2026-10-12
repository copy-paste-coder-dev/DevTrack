export function calculateDurationMinutes(startAt: Date, endAt: Date) {
  const minutes = Math.round((endAt.getTime() - startAt.getTime()) / 60000)
  if (!Number.isFinite(minutes) || minutes <= 0)
    throw new Error('End time must be after start time.')
  return minutes
}
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${remainder}m`
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}
