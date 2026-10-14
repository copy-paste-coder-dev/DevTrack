import { addDays, format, isToday, startOfMonth } from 'date-fns'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo,
  Plus,
  Sparkles,
  Timer,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatCard } from '../../components/ui/StatCard'
import { ErrorState } from '../../components/feedback/ErrorState'
import { DashboardSkeleton, StatsSkeleton } from '../../components/feedback/LoadingState'
import { MonthCalendar } from '../calendar/components/MonthCalendar'
import { useSelectedDay } from '../calendar/hooks/useSelectedDay'
import { ActivityTimeline } from './components/ActivityTimeline'
import { DaySummary } from './components/DaySummary'
import { useMonthAnalysis } from '../calendar/hooks/useMonthAnalysis'
import { formatDuration } from '../../utils/duration'
import { useUserPreferences } from '../settings/hooks/useUserPreferences'
import { useActivityWorkflow } from '../productivity/hooks/useActivityWorkflow'
import { WorkflowDialogs } from '../productivity/components/WorkflowDialogs'
import { ShortcutHint } from '../productivity/components/ShortcutHint'

export function DashboardPage() {
  const preferences = useUserPreferences()
  const { selected, dateKey, selectDay, calendarFocusRequest } = useSelectedDay()
  const monthData = useMonthAnalysis(selected)
  const {
    selectedActivities: activities,
    selectedAnalysis: analysis,
    isLoading,
    error,
    retry,
  } = monthData
  const workflow = useActivityWorkflow({
    selected,
    selectDay,
    activities,
    disabled: isLoading || Boolean(error) || preferences.isLoading,
  })
  return (
    <PageContainer className="dashboard-page">
      <div className="dashboard-top">
        <div className="page-heading dashboard-heading">
          <div>
            <span className="eyebrow">YOUR WORK, IN FOCUS</span>
            <h1>{isToday(selected) ? 'Today' : format(selected, 'EEEE')}</h1>
            <p>{format(selected, 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
        <div className="day-switcher">
          <Button
            variant="ghost"
            className="icon-button"
            aria-label="Previous day"
            onClick={() => selectDay(addDays(selected, -1))}
          >
            <ChevronLeft size={17} />
          </Button>
          <Button variant="ghost" onClick={() => selectDay(new Date())}>
            Today
            <ShortcutHint>T</ShortcutHint>
          </Button>
          <Button
            variant="ghost"
            className="icon-button"
            aria-label="Next day"
            onClick={() => selectDay(addDays(selected, 1))}
          >
            <ChevronRight size={17} />
          </Button>
        </div>
        <Button
          className="dashboard-add"
          data-add-activity
          aria-keyshortcuts="N"
          disabled={isLoading || Boolean(error) || preferences.isLoading}
          onClick={workflow.add}
        >
          <Plus size={17} />
          Add activity
          <ShortcutHint>N</ShortcutHint>
        </Button>
        {isLoading ? (
          <StatsSkeleton />
        ) : !error ? (
          <div className="stats-grid">
            <StatCard
              label="Total logged"
              value={formatDuration(analysis.totalLoggedMinutes)}
              icon={Clock3}
              tone="cyan"
              detail={`${formatDuration(analysis.workdayTargetMinutes)} workday target`}
            />
            <StatCard
              label="Activities"
              value={String(analysis.activityCount).padStart(2, '0')}
              icon={ListTodo}
              tone="purple"
              detail="A little progress adds up"
            />
            <StatCard
              label="Completed"
              value={String(analysis.completedCount).padStart(2, '0')}
              icon={CheckCheck}
              tone="green"
              detail="One less thing on your list"
            />
            <StatCard
              label="Open activities"
              value={String(analysis.openCount).padStart(2, '0')}
              icon={Timer}
              tone="blue"
              detail={`${analysis.inProgressCount} in progress · ${analysis.onHoldCount} on hold`}
            />
            <StatCard
              label="Remaining to target"
              value={preferences.isLoading ? '—' : formatDuration(analysis.remainingTargetMinutes)}
              icon={Clock3}
              tone="amber"
              detail={
                analysis.isFuture
                  ? 'Based on future logs'
                  : analysis.isTargetMet
                    ? 'Time target reached'
                    : 'Based on all logged time'
              }
            />
          </div>
        ) : null}
      </div>
      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <Card>
          <ErrorState description={error} onRetry={retry} />
        </Card>
      ) : (
        <div className="dashboard-grid">
          <div className="day-context">
            <Card>
              <MonthCalendar
                selected={selected}
                onSelect={selectDay}
                month={startOfMonth(selected)}
                onMonthChange={selectDay}
                dayAnalyses={monthData.analysis.days}
                todayKey={monthData.todayKey}
                focusRequest={calendarFocusRequest}
              />
              <Link to={`/app/calendar?date=${dateKey}`} className="calendar-link">
                Open calendar <ArrowUpRight size={14} />
              </Link>
            </Card>
            <DaySummary analysis={analysis} />
            <div className="focus-note">
              <Sparkles size={17} />
              <p>
                Small steps.
                <br />
                <strong>Meaningful progress.</strong>
              </p>
            </div>
          </div>
          <Card className="timeline-card">
            <div className="timeline-header">
              <div>
                <h2>
                  Your timeline <span className="count-badge">{activities.length}</span>
                </h2>
                <p>A clear picture of where your day goes.</p>
              </div>
              <span className="timeline-date">
                <CalendarDays size={14} />
                {format(selected, 'MMM d')}
              </span>
            </div>
            <div className="timeline-tools">
              {workflow.canRepeat && (
                <Button variant="secondary" onClick={workflow.repeatLast}>
                  Repeat last
                </Button>
              )}
              <Button variant="ghost" onClick={workflow.showHelp} aria-label="Keyboard shortcuts">
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
      )}
      <WorkflowDialogs workflow={workflow} dateKey={dateKey} activities={activities} />
    </PageContainer>
  )
}
