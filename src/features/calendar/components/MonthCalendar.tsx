import { useLayoutEffect, type KeyboardEvent, type RefObject } from 'react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { toDateKey } from '../../../utils/date'
import type { DailyAnalysis } from '../../analytics/types/analytics'
import { getCalendarDayMeta } from '../../analytics/domain/monthAnalysis'
import { getDayStateLabel } from '../../analytics/domain/dailyAnalysis'
import { formatDuration } from '../../../utils/duration'

interface MonthCalendarProps {
  selected: Date
  onSelect: (date: Date) => void
  expanded?: boolean
  dayAnalyses: Readonly<Record<string, DailyAnalysis>>
  todayKey: string
  month: Date
  onMonthChange: (date: Date) => void
  focusRequest: RefObject<string | null>
}
export function MonthCalendar({
  selected,
  onSelect,
  expanded = false,
  dayAnalyses,
  todayKey,
  month,
  onMonthChange,
  focusRequest: focusRequestRef,
}: MonthCalendarProps) {
  const selectedKey = toDateKey(selected)
  // Month queries briefly render a skeleton. Keep the keyboard request in the
  // parent so focus can be restored when this calendar mounts with the new data.
  useLayoutEffect(() => {
    if (focusRequestRef.current !== selectedKey) return
    document.getElementById(`day-${expanded ? 'large' : 'small'}-${selectedKey}`)?.focus()
    focusRequestRef.current = null
  }, [selectedKey, expanded, focusRequestRef])
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function selectWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, day: Date) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
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
    focusRequestRef.current = toDateKey(next)
    onSelect(next)
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
            onClick={() => onMonthChange(addMonths(selected, -1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            className="icon-button"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonths(selected, 1))}
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
          const analysis = dayAnalyses[key]
          const meta = getCalendarDayMeta(key, toDateKey(selected), todayKey, analysis)
          const hasActivities = meta.activityCount > 0
          const details = analysis
            ? `${getDayStateLabel(analysis)}. ${meta.activityCount} activities. ${formatDuration(meta.loggedMinutes)} logged. ${Math.round(meta.completionPercent)}% of workday. ${formatDuration(analysis.gapMinutes)} gaps.`
            : 'Choose this date to load its activity.'
          return (
            <button
              key={key}
              id={`day-${expanded ? 'large' : 'small'}-${key}`}
              type="button"
              className={`calendar-day state-${meta.state} ${isSameMonth(day, month) ? '' : 'outside'} ${meta.isSelected ? 'selected' : ''} ${meta.isToday ? 'is-today' : ''}`}
              aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}${hasActivities ? ', activities' : ''}`}
              aria-description={details}
              aria-current={meta.isToday ? 'date' : undefined}
              title={`${format(day, 'MMM d')}: ${details}`}
              aria-pressed={isSameDay(day, selected)}
              onClick={() => onSelect(day)}
              onKeyDown={(event) => selectWithKeyboard(event, day)}
            >
              <span>{format(day, 'd')}</span>
              {hasActivities && (
                <span className="calendar-dots">
                  <i />
                  {meta.state === 'target_met' && <span aria-hidden="true">✓</span>}
                  {meta.state === 'over_target' && <span aria-hidden="true">+</span>}
                </span>
              )}
              {expanded && hasActivities && (
                <span className="day-total">{formatDuration(meta.loggedMinutes)}</span>
              )}
            </button>
          )
        })}
      </div>
      {expanded && (
        <div className="calendar-legend">
          <span>
            <i /> Logged / partial
          </span>
          <span>✓ Target met</span>
          <span>+ Over target</span>
          <span>○ Today</span>
        </div>
      )}
    </section>
  )
}
