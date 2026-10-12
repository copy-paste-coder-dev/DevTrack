import { ArrowDownRight, ArrowUpRight, Clock3, Coffee } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import type { DaySummaryData } from '../types/activity'
import { formatDuration } from '../../../utils/duration'

export function DaySummary({
  startTime,
  endTime,
  loggedMinutes,
  workMinutes,
  breakMinutes,
}: DaySummaryData) {
  return (
    <Card className="day-summary">
      <div className="section-heading">
        <h2>Day at a glance</h2>
        <Clock3 size={16} aria-hidden="true" />
      </div>
      <dl>
        <div>
          <dt>
            <ArrowUpRight size={13} />
            Work start
          </dt>
          <dd>{startTime ?? '—'}</dd>
        </div>
        <div>
          <dt>
            <ArrowDownRight size={13} />
            Work end
          </dt>
          <dd>{endTime ?? '—'}</dd>
        </div>
        <div>
          <dt>
            <Clock3 size={13} />
            Total logged
          </dt>
          <dd>{formatDuration(loggedMinutes)}</dd>
        </div>
        <div>
          <dt>
            <Coffee size={13} />
            Break time
          </dt>
          <dd>{formatDuration(breakMinutes)}</dd>
        </div>
        <div>
          <dt>Work time</dt>
          <dd>{formatDuration(workMinutes)}</dd>
        </div>
      </dl>
    </Card>
  )
}
