import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { isValid, parseISO } from 'date-fns'
import { demoDateKey } from '../../../mocks/activities.mock'
import { toDateKey } from '../../../utils/date'

export function useSelectedDay() {
  const [params, setParams] = useSearchParams()
  const [calendarRevision, setCalendarRevision] = useState(0)
  const value = params.get('date') ?? demoDateKey
  const parsed = parseISO(value)
  const selected =
    /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parsed) ? parsed : parseISO(demoDateKey)
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
