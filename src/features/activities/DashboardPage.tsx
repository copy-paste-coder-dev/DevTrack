import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  Clock3,
  Coffee,
  ListTodo,
  Plus,
  Sparkles,
  Timer,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { MonthCalendar } from '../calendar/components/MonthCalendar'
import { useSelectedDay } from '../calendar/hooks/useSelectedDay'
import { ActivityTimeline } from './components/ActivityTimeline'
import { ActivityDialog, type DialogSelection } from './components/ActivityDialog'
import { demoDateKey, getDemoActivities } from './data/demo'

export function DashboardPage() {
  const { selected, dateKey, selectDay, calendarRevision } = useSelectedDay()
  const [dialog, setDialog] = useState<DialogSelection | null>(null)
  const activities = getDemoActivities(dateKey)
  const hasActivities = activities.length > 0
  const stats = [
    {
      label: 'Total logged',
      value: hasActivities ? '6h 30m' : '0h 00m',
      icon: Clock3,
      color: 'cyan',
      detail: 'Every block, accounted for',
    },
    {
      label: 'Activities',
      value: String(activities.length).padStart(2, '0'),
      icon: ListTodo,
      color: 'purple',
      detail: 'A little progress adds up',
    },
    {
      label: 'Completed',
      value: hasActivities ? '04' : '00',
      icon: CheckCheck,
      color: 'green',
      detail: 'One less thing on your list',
    },
    {
      label: 'In progress',
      value: hasActivities ? '01' : '00',
      icon: Timer,
      color: 'blue',
      detail: 'Keep the momentum going',
    },
    {
      label: 'On hold',
      value: hasActivities ? '01' : '00',
      icon: CirclePause,
      color: 'amber',
      detail: 'Ready when you are',
    },
  ]
  return (
    <PageContainer>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR WORK, IN FOCUS</span>
          <h1>{dateKey === demoDateKey ? 'Today' : format(selected, 'EEEE')}</h1>
          <p>
            {format(selected, 'EEEE, MMMM d, yyyy')}
            <span className="sample-badge">Sample day</span>
          </p>
        </div>
        <div className="page-heading-actions">
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
          <Button onClick={() => setDialog({ activity: null })}>
            <Plus size={17} />
            Add activity
          </Button>
        </div>
      </div>
      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, color, detail }) => (
          <Card className={`stat-card tone-${color}`} key={label}>
            <div className="stat-label">
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong>{value}</strong>
            <span className="stat-detail">{detail}</span>
          </Card>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="day-context">
          <Card>
            <MonthCalendar
              key={format(selected, 'yyyy-MM') + calendarRevision}
              selected={selected}
              onSelect={selectDay}
            />
            <Link to={`/app/calendar?date=${dateKey}`} className="calendar-link">
              Open calendar <ArrowUpRight size={14} />
            </Link>
          </Card>
          <Card className="day-summary">
            <div className="section-heading">
              <h2>Day at a glance</h2>
              <Clock3 size={16} />
            </div>
            <dl>
              <div>
                <dt>
                  <ArrowUpRight size={13} />
                  Work start
                </dt>
                <dd>{hasActivities ? '09:00' : '—'}</dd>
              </div>
              <div>
                <dt>
                  <ArrowDownRight size={13} />
                  Last activity ends
                </dt>
                <dd>{hasActivities ? '15:30' : '—'}</dd>
              </div>
              <div>
                <dt>
                  <Coffee size={13} />
                  Break time
                </dt>
                <dd>{hasActivities ? '30m' : '—'}</dd>
              </div>
            </dl>
            <div className="focus-progress">
              <div>
                <span>
                  Work time <span className="muted">/ 8h goal</span>
                </span>
                <strong>{hasActivities ? '6h' : '0h'}</strong>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Sample daily work goal"
                aria-valuenow={hasActivities ? 75 : 0}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: hasActivities ? '75%' : '0%' }} />
              </div>
              <p>
                {hasActivities ? '2h of room left in your day.' : 'Your day is yours to shape.'}
              </p>
            </div>
          </Card>
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
          <ActivityTimeline activities={activities} onOpen={setDialog} />
        </Card>
      </div>
      {dialog && <ActivityDialog {...dialog} dateKey={dateKey} onClose={() => setDialog(null)} />}
    </PageContainer>
  )
}
