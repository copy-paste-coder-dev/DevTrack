import { useSearchParams } from 'react-router-dom'
import { useMemo, useRef } from 'react'
import { parseISO } from 'date-fns'
import { isDateKey, toDateKey } from '../../../utils/date'

export function useSelectedDay() {
  const [params, setParams] = useSearchParams()
  const calendarFocusRequest = useRef<string | null>(null)
  const value = params.get('date') ?? toDateKey(new Date())
  const selected = useMemo(() => (isDateKey(value) ? parseISO(value) : new Date()), [value])
  function selectDay(date: Date) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set('date', toDateKey(date))
        return next
      },
      { flushSync: true },
    )
  }
  return { selected, dateKey: toDateKey(selected), selectDay, calendarFocusRequest }
}
