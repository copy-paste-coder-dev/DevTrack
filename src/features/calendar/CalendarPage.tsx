import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarDays, Plus } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { MonthCalendar } from './components/MonthCalendar'
import { useSelectedDay } from './hooks/useSelectedDay'
import { ActivityTimeline } from '../activities/components/ActivityTimeline'
import { ActivityDialog, type DialogSelection } from '../activities/components/ActivityDialog'
import { demoDateKey, getDemoActivities } from '../activities/data/demo'

export function CalendarPage() {
  const { selected, dateKey, selectDay, calendarRevision } = useSelectedDay()
  const [dialog, setDialog] = useState<DialogSelection | null>(null)
  const activities = getDemoActivities(dateKey)
  return (
    <PageContainer>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE EVERY DAY COUNT</span>
          <h1>Calendar</h1>
          <p>Your work, with a little more perspective.</p>
        </div>
        <div className="page-heading-actions">
          <Button variant="secondary" onClick={() => selectDay(parseISO(demoDateKey))}>
            <CalendarDays size={15} />
            Today
          </Button>
          <Button onClick={() => setDialog({ activity: null })}>
            <Plus size={17} />
            Add activity
          </Button>
        </div>
      </div>
      <div className="calendar-page-grid">
        <Card className="calendar-main">
          <MonthCalendar
            key={format(selected, 'yyyy-MM') + calendarRevision}
            selected={selected}
            onSelect={selectDay}
            expanded
          />
        </Card>
        <Card className="selected-day-card">
          <div className="selected-day-header">
            <span className="eyebrow">SELECTED DAY</span>
            <h2>{format(selected, 'EEEE, MMM d')}</h2>
            <p>
              {activities.length} activities <span>·</span>{' '}
              {activities.length ? '6h 30m logged' : '0h logged'}
            </p>
          </div>
          <ActivityTimeline activities={activities} onOpen={setDialog} compact />
        </Card>
      </div>
      <div className="page-note">
        Sample activities are available on October 9, 12 and 13, 2026. Select any other date to
        preview an empty day.
      </div>
      {dialog && <ActivityDialog {...dialog} dateKey={dateKey} onClose={() => setDialog(null)} />}
    </PageContainer>
  )
}
