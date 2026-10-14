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
import { useMonthAnalysis } from './hooks/useMonthAnalysis'
import { DaySummary } from '../activities/components/DaySummary'
import { MonthSummary } from './components/MonthSummary'
import { useUserPreferences } from '../settings/hooks/useUserPreferences'
import { useActivityWorkflow } from '../productivity/hooks/useActivityWorkflow'
import { WorkflowDialogs } from '../productivity/components/WorkflowDialogs'
import { ShortcutHint } from '../productivity/components/ShortcutHint'
import { addDays } from 'date-fns'

type CalendarView = 'Month' | 'Day'
export function CalendarPage() {
  const preferences = useUserPreferences()
  const { selected, dateKey, selectDay, calendarFocusRequest } = useSelectedDay()
  const monthData = useMonthAnalysis(selected)
  const { isLoading, error, retry } = monthData
  const [view, setView] = useState<CalendarView>('Month')
  const { selectedActivities: activities, selectedAnalysis: analysis } = monthData
  const workflow = useActivityWorkflow({
    selected,
    selectDay,
    activities,
    disabled: isLoading || Boolean(error) || preferences.isLoading,
  })
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
            <ShortcutHint>T</ShortcutHint>
          </Button>
          <Button
            data-add-activity
            aria-keyshortcuts="N"
            disabled={isLoading || Boolean(error) || preferences.isLoading}
            onClick={workflow.add}
          >
            <Plus size={17} />
            Add activity
            <ShortcutHint>N</ShortcutHint>
          </Button>
        </div>
      </div>
      <div className="calendar-tabs" role="tablist" aria-label="Calendar view">
        {(['Month', 'Day'] as const).map((label, index, tabs) => (
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
        <button
          type="button"
          role="tab"
          aria-selected={false}
          tabIndex={-1}
          disabled
          title="Week view is coming soon"
        >
          Week · Coming soon
        </button>
      </div>
      <div id="calendar-view-panel" role="tabpanel" aria-labelledby={`tab-${view}`}>
        {isLoading ? (
          <CalendarLoadingState />
        ) : error ? (
          <Card>
            <ErrorState title="Unable to load your calendar." description={error} onRetry={retry} />
          </Card>
        ) : (
          <>
            {view === 'Month' && <MonthSummary analysis={monthData.analysis} />}
            <div className={`calendar-page-grid ${view === 'Day' ? 'day-view' : ''}`}>
              {view === 'Month' && (
                <Card className="calendar-main">
                  <MonthCalendar
                    selected={selected}
                    onSelect={selectDay}
                    month={startOfMonth(selected)}
                    onMonthChange={selectDay}
                    dayAnalyses={monthData.analysis.days}
                    todayKey={monthData.todayKey}
                    focusRequest={calendarFocusRequest}
                    expanded
                  />
                </Card>
              )}
              <div className="selected-day-detail">
                <div className="selected-day-header">
                  <span className="eyebrow">SELECTED DAY</span>
                  <h2>{format(selected, 'EEEE, MMM d, yyyy')}</h2>
                  <div className="selected-day-navigation">
                    <Button
                      variant="ghost"
                      aria-label="Previous day"
                      onClick={() => selectDay(addDays(selected, -1))}
                    >
                      ← Previous
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Next day"
                      onClick={() => selectDay(addDays(selected, 1))}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
                <DaySummary analysis={analysis} />
              </div>
              <Card className="selected-day-card">
                <div className="selected-day-header">
                  <h2>
                    Your timeline <span className="count-badge">{activities.length}</span>
                  </h2>
                </div>
                <div className="timeline-tools">
                  {workflow.canRepeat && (
                    <Button variant="secondary" onClick={workflow.repeatLast}>
                      Repeat last
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={workflow.showHelp}
                    aria-label="Keyboard shortcuts"
                  >
                    Shortcuts <ShortcutHint>?</ShortcutHint>
                  </Button>
                </div>
                <ActivityTimeline
                  key={dateKey}
                  activities={activities}
                  dateKey={dateKey}
                  analysis={analysis}
                  onLogGap={workflow.logGap}
                  onAdd={workflow.add}
                  onEdit={workflow.edit}
                  onDelete={workflow.remove}
                  onDuplicate={workflow.duplicate}
                />
              </Card>
            </div>
          </>
        )}
      </div>
      <WorkflowDialogs workflow={workflow} dateKey={dateKey} activities={activities} />
    </PageContainer>
  )
}
