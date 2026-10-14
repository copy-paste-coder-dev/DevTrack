import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { useActivitiesByRange } from '../../activities/hooks/useActivitiesByRange'
import { useUserPreferences } from '../../settings/hooks/useUserPreferences'
import { buildMonthAnalysis, groupActivitiesByDate } from '../../analytics/domain/monthAnalysis'
import { getMonthDateRange, toDateKey } from '../../../utils/date'

// One range listener per route supplies both the calendar and selected-day timeline.
export function useMonthAnalysis(selected: Date) {
  const { preferences } = useUserPreferences()
  const range = getMonthDateRange(selected)
  const data = useActivitiesByRange(range.startDateKey, range.endDateKey)
  const todayKey = toDateKey(new Date())
  const analysis = useMemo(
    () =>
      buildMonthAnalysis({
        month: parseISO(range.startDateKey),
        activities: data.activities,
        preferences,
        now: parseISO(todayKey),
      }),
    [range.startDateKey, data.activities, preferences, todayKey],
  )
  const groups = useMemo(() => groupActivitiesByDate(data.activities), [data.activities])
  const selectedAnalysis = analysis.days[toDateKey(selected)]
  if (!selectedAnalysis)
    throw new Error('The selected date must be included in its month analysis.')
  return {
    ...data,
    analysis,
    todayKey,
    selectedAnalysis,
    selectedActivities: groups.get(toDateKey(selected)) ?? [],
  }
}
