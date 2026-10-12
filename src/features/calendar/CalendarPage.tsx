import { useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { CalendarDays, Plus } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/feedback/ErrorState'
import { CalendarLoadingState } from '../../components/feedback/LoadingState'
import { MonthCalendar } from './components/MonthCalendar'
import { useSelectedDay } from './hooks/useSelectedDay'
import { ActivityTimeline } from '../activities/components/ActivityTimeline'
import { ActivityDialog, type DialogSelection } from '../activities/components/ActivityDialog'
import { useActivitiesByRange } from '../activities/hooks/useActivitiesByRange'
import { getActivityDates, sumDurationMinutes } from '../activities/utils/activitySummary'
import { getMonthDateRange } from '../../utils/date'
import { formatDuration } from '../../utils/duration'

type CalendarView = 'Month' | 'Week' | 'Day'
export function CalendarPage() {
  const { selected, dateKey, selectDay } = useSelectedDay()
  const range = getMonthDateRange(selected)
  const monthData = useActivitiesByRange(range.startDateKey, range.endDateKey)
  const { isLoading, error, retry } = monthData
  const [dialog, setDialog] = useState<DialogSelection | null>(null)
  const [view, setView] = useState<CalendarView>('Month')
  const activities = monthData.activities.filter((activity) => activity.dateKey === dateKey)
  return (
    <PageContainer>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE EVERY DAY COUNT</span>
          <h1>Calendar</h1>
          <p>View and manage your daily activities.</p>
        </div>
        <div className="page-heading-actions">
          <Button variant="secondary" onClick={() => selectDay(new Date())}>
            <CalendarDays size={15} />
            Today
          </Button>
          <Button onClick={() => setDialog({ activity: null })}>
            <Plus size={17} />
            Add activity
          </Button>
        </div>
      </div>
      <div className="calendar-tabs" role="tablist" aria-label="Calendar view">
        {(['Month', 'Week', 'Day'] as const).map((label, index, tabs) => (
          <button
            type="button"
            key={label}
            id={`tab-${label}`}
            role="tab"
            aria-selected={view === label}
            aria-controls="calendar-view-panel"
            tabIndex={view === label ? 0 : -1}
            onClick={() => setView(label)}
            onKeyDown={(event) => {
              let next: CalendarView | undefined
              if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length]
              if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length]
              if (event.key === 'Home') next = tabs[0]
              if (event.key === 'End') next = tabs[tabs.length - 1]
              if (next) {
                event.preventDefault()
                setView(next)
                document.getElementById(`tab-${next}`)?.focus()
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div id="calendar-view-panel" role="tabpanel" aria-labelledby={`tab-${view}`}>
        {view !== 'Month' ? (
          <Card className="calendar-view-placeholder">
            <CalendarDays size={30} />
            <h2>{view} view is on the roadmap</h2>
            <p>Explore the month view to select a date and review its activities.</p>
            <Button variant="secondary" onClick={() => setView('Month')}>
              Back to month view
            </Button>
          </Card>
        ) : isLoading ? (
          <CalendarLoadingState />
        ) : error ? (
          <Card>
            <ErrorState title="Unable to load your calendar." description={error} onRetry={retry} />
          </Card>
        ) : (
          <div className="calendar-page-grid">
            <Card className="calendar-main">
              <MonthCalendar
                selected={selected}
                onSelect={selectDay}
                month={startOfMonth(selected)}
                onMonthChange={selectDay}
                activityDates={getActivityDates(monthData.activities)}
                expanded
              />
            </Card>
            <Card className="selected-day-card">
              <div className="selected-day-header">
                <span className="eyebrow">SELECTED DAY</span>
                <h2>{format(selected, 'EEEE, MMM d')}</h2>
                <p>
                  {activities.length} activities <span>·</span>{' '}
                  {formatDuration(sumDurationMinutes(activities))} logged
                </p>
              </div>
              <ActivityTimeline
                activities={activities}
                onAdd={() => setDialog({ activity: null })}
                onEdit={(activity) => setDialog({ activity })}
                onDelete={(activity) => setDialog({ activity, action: 'delete' })}
                compact
              />
            </Card>
          </div>
        )}
      </div>
      {dialog && (
        <ActivityDialog
          key={dialog.activity?.id ?? 'create'}
          {...dialog}
          dateKey={dateKey}
          onClose={() => setDialog(null)}
        />
      )}
    </PageContainer>
  )
}
