import { ArrowDownRight, ArrowUpRight, Clock3, Coffee } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import type { DaySummaryData } from '../types/activity'
import { formatDuration } from '../../../utils/duration'

export function DaySummary({
  startTime,
  endTime,
  loggedMinutes,
  remainingMinutes,
  workMinutes,
  goalMinutes,
  breakMinutes,
}: DaySummaryData) {
  const progress =
    goalMinutes > 0 ? Math.min(100, Math.round((workMinutes / goalMinutes) * 100)) : 0
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
          <dt>Remaining</dt>
          <dd>{formatDuration(remainingMinutes)}</dd>
        </div>
      </dl>
      <div className="focus-progress">
        <div>
          <span>
            Work time <span className="muted">/ {formatDuration(goalMinutes)} goal</span>
          </span>
          <strong>{formatDuration(workMinutes)}</strong>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Sample daily work goal"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <p>
          {remainingMinutes > 0
            ? `${formatDuration(remainingMinutes)} of room left in your day.`
            : 'Your sample work goal is complete.'}
        </p>
      </div>
    </Card>
  )
}
