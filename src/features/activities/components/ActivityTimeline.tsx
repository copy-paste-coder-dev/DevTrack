import { EmptyState } from '../../../components/ui/EmptyState'
import { ActivityCard, type ActivityCardProps } from './ActivityCard'
import { activityMeta } from '../config/presentation'
import type { Activity } from '../types/activity'
import { sortActivities } from '../utils/activitySummary'
import { Fragment, useState } from 'react'
import { Clock3, Plus } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { GAP_DISPLAY_THRESHOLD_MINUTES, type ActivityGap } from '../domain/activityTime'
import { useUserPreferences } from '../../settings/hooks/useUserPreferences'
import { formatTime, formatTimeString } from '../../settings/utils/timeFormat'
import { formatDuration } from '../../../utils/duration'
import type { DailyAnalysis } from '../../analytics/types/analytics'
import { filterActivities } from '../domain/productivity'
import { ActivityFilters } from './ActivityFilters'
import type { ActivityStatus } from '../types/activity'

interface ActivityTimelineProps {
  activities: Activity[]
  dateKey: string
  onLogGap: (gap: ActivityGap) => void
  onEdit: (activity: Activity) => void
  onDelete: (activity: Activity) => void
  onDuplicate: (activity: Activity) => void
  onAdd: () => void
  compact?: boolean
  analysis: DailyAnalysis
}
export function ActivityTimelineItem(props: ActivityCardProps) {
  const { preferences } = useUserPreferences()
  return (
    <li className={`timeline-item tone-${activityMeta[props.activity.activityType].color}`}>
      <span className="timeline-time">
        {formatTime(props.activity.startAt, preferences.timeFormat)}
      </span>
      <span className="timeline-dot" />
      <ActivityCard {...props} />
    </li>
  )
}
export function ActivityTimeline({
  activities,
  onLogGap,
  onEdit,
  onDelete,
  onDuplicate,
  onAdd,
  compact = false,
  analysis,
}: ActivityTimelineProps) {
  const {
    preferences: { dayStartTime, timeFormat },
    isLoading,
  } = useUserPreferences()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ActivityStatus | 'all'>('all')
  const filtering = Boolean(search.trim() || status !== 'all')
  const clear = () => {
    setSearch('')
    setStatus('all')
  }
  if (!activities.length)
    return (
      <EmptyState
        onAdd={onAdd}
        disabled={isLoading}
        title={
          analysis.isFuture
            ? 'No activities planned/logged for this day.'
            : 'No activities logged for this day.'
        }
        description={
          isLoading
            ? 'Loading your workday preferences…'
            : `Your day starts at ${formatTimeString(dayStartTime, timeFormat)}.`
        }
      />
    )
  const gaps = analysis.gaps.filter((gap) => gap.durationMinutes >= GAP_DISPLAY_THRESHOLD_MINUTES)
  const sorted = sortActivities(filterActivities(activities, search, status))
  // Index the next activity once, rather than searching the whole day for every gap/row.
  const firstActivityByStart = new Map<number, string>()
  for (const activity of sorted) {
    const start = Math.floor(activity.startAt.getTime() / 60000) * 60000
    if (!firstActivityByStart.has(start)) firstActivityByStart.set(start, activity.id)
  }
  const gapsByActivity = new Map<string, ActivityGap[]>()
  if (!filtering)
    for (const gap of gaps) {
      const id = firstActivityByStart.get(gap.endAt.getTime())
      if (id) gapsByActivity.set(id, [...(gapsByActivity.get(id) ?? []), gap])
    }
  return (
    <>
      <ActivityFilters
        search={search}
        status={status}
        onSearch={setSearch}
        onStatus={setStatus}
        onClear={clear}
      />
      {filtering && (
        <p className="filter-count" role="status">
          Showing {sorted.length} of {activities.length} activities. Daily totals use the full day;
          gaps are hidden while filtering.
        </p>
      )}
      {!sorted.length && (
        <div className="filter-empty">
          <p>No activities match your filters.</p>
        </div>
      )}
      <ol
        className={`activity-timeline ${compact ? 'compact' : ''} format-${timeFormat}`}
        aria-label="Daily activities"
      >
        {sorted.map((activity) => (
          <Fragment key={activity.id}>
            {!filtering &&
              gapsByActivity.get(activity.id)?.map((gap) => (
                <li className="timeline-gap" key={gap.startAt.getTime()}>
                  <div>
                    <Clock3 size={15} />
                    <strong>{formatDuration(gap.durationMinutes)} unlogged</strong>
                    <span>
                      {formatTime(gap.startAt, timeFormat)}–{formatTime(gap.endAt, timeFormat)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => onLogGap(gap)}
                    disabled={isLoading}
                    aria-label={`Log activity from ${formatTime(gap.startAt, timeFormat)} to ${formatTime(gap.endAt, timeFormat)}`}
                  >
                    <Plus size={15} />
                    Log {formatDuration(gap.durationMinutes)}
                  </Button>
                </li>
              ))}
            <ActivityTimelineItem
              activity={activity}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          </Fragment>
        ))}
        {!compact && !filtering && (
          <li className="timeline-end">
            <span>{analysis.actualEnd ? formatTime(analysis.actualEnd, timeFormat) : '—'}</span>
            <i />
            <span>You made room for good work.</span>
          </li>
        )}
      </ol>
    </>
  )
}
