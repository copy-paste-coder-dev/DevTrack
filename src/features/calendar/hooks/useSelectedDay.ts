import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { parseISO } from 'date-fns'
import { isDateKey, toDateKey } from '../../../utils/date'

export function useSelectedDay() {
  const [params, setParams] = useSearchParams()
  const [calendarRevision, setCalendarRevision] = useState(0)
  const value = params.get('date') ?? toDateKey(new Date())
  const selected = isDateKey(value) ? parseISO(value) : new Date()
  function selectDay(date: Date) {
    setCalendarRevision((previous) => previous + 1)
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('date', toDateKey(date))
      return next
    })
  }
  return { selected, dateKey: toDateKey(selected), selectDay, calendarRevision }
}
