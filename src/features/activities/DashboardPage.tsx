import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CirclePause,
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
import { ActivityDialog, type DialogSelection } from './components/ActivityDialog'
import { DaySummary } from './components/DaySummary'
import { demoDateKey, getMockDay } from '../../mocks/activities.mock'
import { calendarActivityDates } from '../../mocks/calendar.mock'
import { usePreviewState } from '../../mocks/usePreviewState'
import { formatDuration } from '../../utils/duration'

export function DashboardPage() {
  const { selected, dateKey, selectDay, calendarRevision } = useSelectedDay()
  const { state, retry } = usePreviewState()
  const [dialog, setDialog] = useState<DialogSelection | null>(null)
  const { activities, summary, counts } = getMockDay(dateKey)
  return (
    <PageContainer className="dashboard-page">
      <div className="dashboard-top">
        <div className="page-heading dashboard-heading">
          <div>
            <span className="eyebrow">YOUR WORK, IN FOCUS</span>
            <h1>{dateKey === demoDateKey ? 'Today' : format(selected, 'EEEE')}</h1>
            <p>
              {format(selected, 'EEEE, MMMM d, yyyy')}
              <span className="sample-badge">Sample day</span>
            </p>
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
          <Button variant="ghost" onClick={() => selectDay(parseISO(demoDateKey))}>
            Today
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
        <Button className="dashboard-add" onClick={() => setDialog({ activity: null })}>
          <Plus size={17} />
          Add activity
        </Button>
        {state === 'loading' ? (
          <StatsSkeleton />
        ) : state === 'ready' ? (
          <div className="stats-grid">
            <StatCard
              label="Total logged"
              value={formatDuration(summary.loggedMinutes)}
              icon={Clock3}
              tone="cyan"
              detail="Every block, accounted for"
            />
            <StatCard
              label="Activities"
              value={String(activities.length).padStart(2, '0')}
              icon={ListTodo}
              tone="purple"
              detail="A little progress adds up"
            />
            <StatCard
              label="Completed"
              value={String(counts.completed).padStart(2, '0')}
              icon={CheckCheck}
              tone="green"
              detail="One less thing on your list"
            />
            <StatCard
              label="In progress"
              value={String(counts.inProgress).padStart(2, '0')}
              icon={Timer}
              tone="blue"
              detail="Keep the momentum going"
            />
            <StatCard
              label="On hold"
              value={String(counts.onHold).padStart(2, '0')}
              icon={CirclePause}
              tone="amber"
              detail="Ready when you are"
            />
          </div>
        ) : null}
      </div>
      {state === 'loading' ? (
        <DashboardSkeleton />
      ) : state === 'error' ? (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      ) : (
        <div className="dashboard-grid">
          <div className="day-context">
            <Card>
              <MonthCalendar
                key={format(selected, 'yyyy-MM') + calendarRevision}
                selected={selected}
                onSelect={selectDay}
                activityDates={calendarActivityDates}
              />
              <Link to={`/app/calendar?date=${dateKey}`} className="calendar-link">
                Open calendar <ArrowUpRight size={14} />
              </Link>
            </Card>
            <DaySummary {...summary} />
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
            <ActivityTimeline
              activities={activities}
              onAdd={() => setDialog({ activity: null })}
              onEdit={(activity) => setDialog({ activity })}
              onDelete={(activity) => setDialog({ activity, action: 'delete' })}
            />
          </Card>
        </div>
      )}
      {dialog && <ActivityDialog {...dialog} dateKey={dateKey} onClose={() => setDialog(null)} />}
    </PageContainer>
  )
}
