import { useState, type KeyboardEvent } from 'react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { toDateKey } from '../../../utils/date'

interface MonthCalendarProps {
  selected: Date
  onSelect: (date: Date) => void
  expanded?: boolean
  activityDates: Readonly<Record<string, string>>
}
export function MonthCalendar({
  selected,
  onSelect,
  expanded = false,
  activityDates,
}: MonthCalendarProps) {
  const [month, setMonth] = useState(startOfMonth(selected))
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function selectWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, day: Date) {
    const increments: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }
    const amount = increments[event.key]
    if (amount === undefined) return
    event.preventDefault()
    const next = addDays(day, amount)
    setMonth(startOfMonth(next))
    onSelect(next)
    requestAnimationFrame(() =>
      document.getElementById(`day-${expanded ? 'large' : 'small'}-${toDateKey(next)}`)?.focus(),
    )
  }

  return (
    <section className={`month-calendar ${expanded ? 'expanded' : ''}`} aria-label="Choose a day">
      <div className="calendar-heading">
        <h2>{format(month, 'MMMM yyyy')}</h2>
        <div>
          <Button
            variant="ghost"
            className="icon-button"
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            className="icon-button"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      <div className="calendar-grid">
        {weekdays.map((day) => (
          <span key={day} className="weekday">
            {expanded ? day : day[0]}
          </span>
        ))}
        {days.map((day) => {
          const key = toDateKey(day)
          const hasActivities = Boolean(activityDates[key])
          return (
            <button
              key={key}
              id={`day-${expanded ? 'large' : 'small'}-${key}`}
              type="button"
              className={`calendar-day ${isSameMonth(day, month) ? '' : 'outside'} ${isSameDay(day, selected) ? 'selected' : ''} ${isToday(day) ? 'is-today' : ''}`}
              aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}${hasActivities ? ', sample activities' : ''}`}
              aria-pressed={isSameDay(day, selected)}
              onClick={() => onSelect(day)}
              onKeyDown={(event) => selectWithKeyboard(event, day)}
            >
              <span>{format(day, 'd')}</span>
              {hasActivities && (
                <span className="calendar-dots">
                  <i />
                  <i />
                  <i />
                </span>
              )}
              {expanded && hasActivities && <span className="day-total">{activityDates[key]}</span>}
            </button>
          )
        })}
      </div>
      {expanded && (
        <div className="calendar-legend">
          <span>
            <i /> Sample activity
          </span>
          <span>Use arrow keys to move between days</span>
        </div>
      )}
    </section>
  )
}
