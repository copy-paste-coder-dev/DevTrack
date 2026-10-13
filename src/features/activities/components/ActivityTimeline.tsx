import { EmptyState } from '../../../components/ui/EmptyState'
import { ActivityCard, type ActivityCardProps } from './ActivityCard'
import { activityMeta } from '../config/presentation'
import type { Activity } from '../types/activity'
import { getLatestEnd, sortActivities } from '../utils/activitySummary'
import { Fragment } from 'react'
import { Clock3, Plus } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import {
  detectActivityGaps,
  GAP_DISPLAY_THRESHOLD_MINUTES,
  type ActivityGap,
} from '../domain/activityTime'
import { useUserPreferences } from '../../settings/hooks/useUserPreferences'
import { formatTime, formatTimeString } from '../../settings/utils/timeFormat'
import { formatDuration } from '../../../utils/duration'

interface ActivityTimelineProps {
  activities: Activity[]
  dateKey: string
  onLogGap: (gap: ActivityGap) => void
  onEdit: (activity: Activity) => void
  onDelete: (activity: Activity) => void
  onAdd: () => void
  compact?: boolean
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
  dateKey,
  onLogGap,
  onEdit,
  onDelete,
  onAdd,
  compact = false,
}: ActivityTimelineProps) {
  const {
    preferences: { dayStartTime, timeFormat },
    isLoading,
  } = useUserPreferences()
  if (!activities.length)
    return (
      <EmptyState
        onAdd={onAdd}
        disabled={isLoading}
        description={
          isLoading
            ? 'Loading your workday preferences…'
            : `Your day starts at ${formatTimeString(dayStartTime, timeFormat)}.`
        }
      />
    )
  const gaps = detectActivityGaps(dateKey, activities, dayStartTime).filter(
    (gap) => gap.durationMinutes >= GAP_DISPLAY_THRESHOLD_MINUTES,
  )
  const sorted = sortActivities(activities)
  return (
    <ol
      className={`activity-timeline ${compact ? 'compact' : ''} format-${timeFormat}`}
      aria-label="Daily activities"
    >
      {sorted.map((activity) => (
        <Fragment key={activity.id}>
          {gaps
            .filter(
              (gap) =>
                sorted.find(
                  (a) => Math.floor(a.startAt.getTime() / 60000) * 60000 === gap.endAt.getTime(),
                )?.id === activity.id,
            )
            .map((gap) => (
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
                  Log activity
                </Button>
              </li>
            ))}
          <ActivityTimelineItem activity={activity} onEdit={onEdit} onDelete={onDelete} />
        </Fragment>
      ))}
      {!compact && (
        <li className="timeline-end">
          <span>{formatTime(getLatestEnd(activities)!, timeFormat)}</span>
          <i />
          <span>You made room for good work.</span>
        </li>
      )}
    </ol>
  )
}
