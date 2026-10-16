import { useMemo } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { CheckCheck, ChevronLeft, ChevronRight, Clock3, ListTodo, Timer } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatCard } from '../../components/ui/StatCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/feedback/ErrorState'
import { useSelectedDay } from '../calendar/hooks/useSelectedDay'
import { useActivities } from '../activities/hooks/useActivities'
import { useUserPreferences } from '../settings/hooks/useUserPreferences'
import { analyzeDay } from '../analytics/domain/dailyAnalysis'
import { buildEodSummary } from './domain/eodSummary'
import { formatDuration } from '../../utils/duration'
import { isDateKey, toDateKey } from '../../utils/date'
import { formatTime, formatTimeString } from '../settings/utils/timeFormat'
import { activityMeta } from '../activities/config/presentation'
import { ActivityTypeIcon } from '../activities/components/ActivityTypeIcon'
import { EodTaskSections } from './components/EodTaskSections'
import { EodOutput } from './components/EodOutput'

export function EodSummarySkeleton() {
  return (
    <div className="eod-stack" role="status" aria-label="Loading EOD summary">
      <Skeleton className="eod-loading" />
      <Skeleton className="eod-loading" />
      <span className="sr-only">Loading EOD summary</span>
    </div>
  )
}

export function EodSummaryPage() {
  const { selected, dateKey, selectDay } = useSelectedDay()
  const data = useActivities(dateKey)
  const settings = useUserPreferences()
  const { preferences } = settings
  const todayKey = toDateKey(new Date())
  const analysis = useMemo(
    () =>
      analyzeDay({ dateKey, activities: data.activities, preferences, now: parseISO(todayKey) }),
    [dateKey, data.activities, preferences, todayKey],
  )
  const summary = useMemo(
    () => buildEodSummary({ dateKey, activities: data.activities, dailyAnalysis: analysis }),
    [dateKey, data.activities, analysis],
  )
  const time = (date: Date | null) => (date ? formatTime(date, preferences.timeFormat) : '—')
  const title = analysis.isFuture
    ? 'Future Date'
    : analysis.isToday
      ? 'Daily Summary'
      : 'End of Day Summary'
  return (
    <PageContainer className="eod-page">
      <header className="eod-header">
        <div className="page-heading">
          <span className="eyebrow">EOD SUMMARY</span>
          <h1>EOD Summary</h1>
          <p>Your development activity summary</p>
        </div>
        <div className="eod-date-controls">
          <Button
            variant="ghost"
            aria-label="Previous day"
            onClick={() => selectDay(addDays(selected, -1))}
          >
            <ChevronLeft size={18} />
          </Button>
          <label>
            <span className="sr-only">Selected date</span>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => {
                if (isDateKey(e.target.value)) selectDay(parseISO(e.target.value))
              }}
            />
          </label>
          <Button
            variant="ghost"
            aria-label="Next day"
            onClick={() => selectDay(addDays(selected, 1))}
          >
            <ChevronRight size={18} />
          </Button>
          <Button variant="secondary" onClick={() => selectDay(new Date())}>
            Today
          </Button>
        </div>
      </header>
      {data.isLoading || settings.isLoading ? (
        <EodSummarySkeleton />
      ) : data.error || settings.error ? (
        <Card>
          <ErrorState
            title="Unable to load EOD summary."
            description={data.error || settings.error || undefined}
            onRetry={() => {
              data.retry()
              settings.retry()
            }}
          />
        </Card>
      ) : (
        <div className="eod-stack">
          <div>
            <h2>
              {title} · {format(selected, 'MMMM d, yyyy')}
            </h2>
            {analysis.isToday && (
              <p>{analysis.isTargetMet ? 'Workday target reached' : 'Workday in progress'}</p>
            )}
          </div>
          {analysis.isFuture ? (
            <Card className="eod-panel">
              <p>No EOD summary is available for future dates.</p>
              {summary.activitySessionCount > 0 && (
                <section>
                  <h2>Planned Activities</h2>
                  <ul>
                    {[
                      ...summary.completedGroups,
                      ...summary.inProgressGroups,
                      ...summary.onHoldGroups,
                    ]
                      .sort((a, b) => a.firstStartAt.getTime() - b.firstStartAt.getTime())
                      .map((group) => (
                        <li key={group.key}>
                          {group.taskName} · {group.sessionCount} sessions ·{' '}
                          {formatDuration(group.totalDurationMinutes)}
                        </li>
                      ))}
                  </ul>
                </section>
              )}
            </Card>
          ) : (
            <EodOutput summary={summary} preferences={preferences}>
              <div className="eod-stats">
                <StatCard
                  label="Logged"
                  value={formatDuration(summary.totalLoggedMinutes)}
                  icon={Clock3}
                  tone="cyan"
                />
                <StatCard
                  label="Target"
                  value={formatDuration(summary.workdayTargetMinutes)}
                  icon={Timer}
                  tone="blue"
                />
                <StatCard
                  label={summary.overtimeMinutes ? 'Overtime' : 'Remaining'}
                  value={formatDuration(summary.overtimeMinutes || summary.remainingMinutes)}
                  icon={Clock3}
                  tone="amber"
                />
                <StatCard
                  label="Sessions"
                  value={String(summary.activitySessionCount)}
                  icon={ListTodo}
                  tone="purple"
                />
                <StatCard
                  label="Unique Work Items"
                  value={String(summary.uniqueWorkItemCount)}
                  icon={ListTodo}
                  tone="cyan"
                />
                <StatCard
                  label="Completed"
                  value={String(summary.completedGroups.length)}
                  detail="Grouped work items"
                  icon={CheckCheck}
                  tone="green"
                />
                <StatCard
                  label="Gaps"
                  value={`${summary.gapCount} · ${formatDuration(summary.totalGapMinutes)}`}
                  icon={Clock3}
                  tone="amber"
                />
              </div>
              {summary.invalidActivityCount > 0 && (
                <p role="status">
                  {summary.invalidActivityCount} invalid activity intervals were excluded. Check the
                  source activities.
                </p>
              )}
              <Card className="eod-panel eod-stack">
                <h2>Workday</h2>
                <div className="eod-progress-label">
                  <span>
                    {formatDuration(summary.totalLoggedMinutes)} /{' '}
                    {formatDuration(summary.workdayTargetMinutes)}
                  </span>
                  <span>{Math.round(summary.progressPercent)}%</span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Workday progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(summary.progressPercent)}
                >
                  <span style={{ width: `${summary.progressPercent}%` }} />
                </div>
                <dl className="eod-workday">
                  <div>
                    <dt>Configured Start</dt>
                    <dd>{formatTimeString(summary.configuredStartTime, preferences.timeFormat)}</dd>
                  </div>
                  <div>
                    <dt>Configured End</dt>
                    <dd>{formatTimeString(summary.configuredEndTime, preferences.timeFormat)}</dd>
                  </div>
                  <div>
                    <dt>Actual Start</dt>
                    <dd>{time(summary.actualStart)}</dd>
                  </div>
                  <div>
                    <dt>Actual End</dt>
                    <dd>{time(summary.actualEnd)}</dd>
                  </div>
                </dl>
              </Card>
              {!summary.activitySessionCount ? (
                <Card className="eod-panel">
                  <p>
                    {analysis.isToday
                      ? 'No activities logged yet.'
                      : 'No activities were logged for this day.'}
                  </p>
                </Card>
              ) : (
                <>
                  <Card className="eod-panel">
                    <h2>Work item status</h2>
                    <p>
                      {summary.completedGroups.length} Completed · {summary.inProgressGroups.length}{' '}
                      In Progress · {summary.onHoldGroups.length} On Hold
                    </p>
                  </Card>
                  <EodTaskSections summary={summary} timeFormat={preferences.timeFormat} />
                  <section className="eod-stack">
                    <h2>Activity type breakdown</h2>
                    <div className="eod-types">
                      {summary.activityTypeBreakdown.map((item) => (
                        <Card key={item.activityType} className="eod-panel">
                          <ActivityTypeIcon type={item.activityType} />
                          <h3>{activityMeta[item.activityType].label}</h3>
                          <strong>{formatDuration(item.totalDurationMinutes)}</strong>
                          <p>
                            {item.activityCount} {item.activityCount === 1 ? 'session' : 'sessions'}{' '}
                            · {item.uniqueTaskCount}{' '}
                            {item.uniqueTaskCount === 1 ? 'work item' : 'work items'}
                          </p>
                          <p>{item.percentageOfLoggedTime.toFixed(1)}% of logged time</p>
                        </Card>
                      ))}
                    </div>
                  </section>
                </>
              )}
              <Card className="eod-panel eod-stack">
                <h2>Unlogged Gaps</h2>
                {summary.gaps.length ? (
                  <ul className="eod-gaps">
                    {summary.gaps.map((gap) => (
                      <li key={gap.startAt.toISOString()}>
                        <span>
                          {time(gap.startAt)}–{time(gap.endAt)}
                        </span>
                        <strong>{formatDuration(gap.durationMinutes)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No unlogged gaps.</p>
                )}
                <p>Total: {formatDuration(summary.totalGapMinutes)}</p>
                <p className="field-hint">
                  Includes gaps before the first activity and between sessions. Remaining target
                  time is shown separately.
                </p>
              </Card>
            </EodOutput>
          )}
        </div>
      )}
    </PageContainer>
  )
}
