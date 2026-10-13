import { ArrowDownRight, ArrowUpRight, Clock3, Coffee } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import type { DaySummaryData } from '../types/activity'
import { formatDuration } from '../../../utils/duration'
import { useUserPreferences } from '../../settings/hooks/useUserPreferences'
import { formatTimeString } from '../../settings/utils/timeFormat'
import {
  calculateRemainingWorkMinutes,
  calculateWorkdayMinutes,
  calculateWorkdayProgress,
} from '../../settings/utils/workday'

export function DaySummary({
  startTime,
  endTime,
  loggedMinutes,
  workMinutes,
  breakMinutes,
}: DaySummaryData) {
  const { preferences, isLoading } = useUserPreferences()
  const target = calculateWorkdayMinutes(preferences.dayStartTime, preferences.dayEndTime)
  const remaining = calculateRemainingWorkMinutes({
    totalLoggedMinutes: loggedMinutes,
    ...preferences,
  })
  const progress = calculateWorkdayProgress(loggedMinutes, target)
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
          <dd>{startTime ? formatTimeString(startTime, preferences.timeFormat) : '—'}</dd>
        </div>
        <div>
          <dt>
            <ArrowDownRight size={13} />
            Work end
          </dt>
          <dd>{endTime ? formatTimeString(endTime, preferences.timeFormat) : '—'}</dd>
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
        {!isLoading && (
          <div>
            <dt>Remaining to target</dt>
            <dd>{formatDuration(remaining)}</dd>
          </div>
        )}
      </dl>
      {!isLoading && (
        <div className="workday-progress">
          <p>
            <span>{formatDuration(target)} workday target</span>
            <strong>{Math.round(progress)}%</strong>
          </p>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Workday logged-time progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="field-hint">Target uses all logged time, including breaks.</p>
        </div>
      )}
    </Card>
  )
}
