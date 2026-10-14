import { Clock3 } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { formatDuration } from '../../../utils/duration'
import { useUserPreferences } from '../../settings/hooks/useUserPreferences'
import { formatTime, formatTimeString } from '../../settings/utils/timeFormat'
import type { DailyAnalysis } from '../../analytics/types/analytics'
import { getDayStateLabel } from '../../analytics/domain/dailyAnalysis'

export function DaySummary({
  analysis,
  className = '',
}: {
  analysis: DailyAnalysis
  className?: string
}) {
  const { preferences, isLoading } = useUserPreferences()
  const time = (date: Date | null) => (date ? formatTime(date, preferences.timeFormat) : '—')
  return (
    <Card className={`day-summary ${className}`}>
      <div className="section-heading">
        <h2>Day at a glance</h2>
        <Clock3 size={16} aria-hidden="true" />
      </div>
      <span className={`day-state state-${analysis.dayState}`}>{getDayStateLabel(analysis)}</span>
      <dl>
        <div>
          <dt>Logged</dt>
          <dd>{formatDuration(analysis.totalLoggedMinutes)}</dd>
        </div>
        {!isLoading && (
          <div>
            <dt>Remaining to target</dt>
            <dd>{formatDuration(analysis.remainingTargetMinutes)}</dd>
          </div>
        )}
        <div>
          <dt>Unlogged gaps</dt>
          <dd>
            {analysis.gapCount} · {formatDuration(analysis.gapMinutes)}
          </dd>
        </div>
        <div>
          <dt>Actual start</dt>
          <dd>{time(analysis.actualStart)}</dd>
        </div>
        <div>
          <dt>Actual end</dt>
          <dd>{time(analysis.actualEnd)}</dd>
        </div>
        <div>
          <dt>Activities completed</dt>
          <dd>
            {analysis.completedCount} / {analysis.activityCount}
          </dd>
        </div>
      </dl>
      <p className="day-status-counts">
        {analysis.inProgressCount} in progress · {analysis.onHoldCount} on hold ·{' '}
        {analysis.openCount} open
      </p>
      {!isLoading && (
        <div
          className={`workday-progress ${analysis.isTargetMet && !analysis.isFuture ? 'target-reached' : ''}`}
        >
          <p>
            <span>Workday progress</span>
            <strong>{Math.round(analysis.completionPercent)}%</strong>
          </p>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Workday logged-time progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(analysis.progressPercent)}
            aria-valuetext={`${formatDuration(analysis.totalLoggedMinutes)} of ${formatDuration(analysis.workdayTargetMinutes)} logged`}
          >
            <span style={{ width: `${analysis.progressPercent}%` }} />
          </div>
          <p>
            <span>
              {formatDuration(analysis.totalLoggedMinutes)} /{' '}
              {formatDuration(analysis.workdayTargetMinutes)}
            </span>
            {analysis.isTargetMet && !analysis.isFuture && <strong>Target met</strong>}
          </p>
          {analysis.overtimeMinutes > 0 && (
            <p className="overtime-note">
              +{formatDuration(analysis.overtimeMinutes)}{' '}
              {analysis.isFuture ? 'over target logged' : 'overtime'}
            </p>
          )}
          <p className="field-hint">
            Configured: {formatTimeString(analysis.configuredStartTime, preferences.timeFormat)}–
            {formatTimeString(analysis.configuredEndTime, preferences.timeFormat)}. Target includes
            breaks.
          </p>
          <p className="field-hint">
            Gaps include time before the first activity and between activities; remaining is target
            minus logged time.
          </p>
        </div>
      )}
      {analysis.invalidActivityCount > 0 && (
        <p role="status">
          {analysis.invalidActivityCount} invalid activities excluded from analysis.
        </p>
      )}
    </Card>
  )
}
