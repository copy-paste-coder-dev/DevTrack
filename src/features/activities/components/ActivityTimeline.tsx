import { EmptyState } from '../../../components/ui/EmptyState'
import { ActivityCard, type ActivityCardProps } from './ActivityCard'
import { activityMeta } from '../config/presentation'
import type { Activity } from '../types/activity'
import { formatDisplayTime } from '../../../utils/date'
import { getLatestEnd, sortActivities } from '../utils/activitySummary'

interface ActivityTimelineProps {
  activities: Activity[]
  onEdit: (activity: Activity) => void
  onDelete: (activity: Activity) => void
  onAdd: () => void
  compact?: boolean
}
export function ActivityTimelineItem(props: ActivityCardProps) {
  return (
    <li className={`timeline-item tone-${activityMeta[props.activity.activityType].color}`}>
      <span className="timeline-time">{formatDisplayTime(props.activity.startAt)}</span>
      <span className="timeline-dot" />
      <ActivityCard {...props} />
    </li>
  )
}
export function ActivityTimeline({
  activities,
  onEdit,
  onDelete,
  onAdd,
  compact = false,
}: ActivityTimelineProps) {
  if (!activities.length) return <EmptyState onAdd={onAdd} />
  return (
    <ol className={`activity-timeline ${compact ? 'compact' : ''}`} aria-label="Daily activities">
      {sortActivities(activities).map((activity) => (
        <ActivityTimelineItem
          key={activity.id}
          activity={activity}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      {!compact && (
        <li className="timeline-end">
          <span>{formatDisplayTime(getLatestEnd(activities)!)}</span>
          <i />
          <span>You made room for good work.</span>
        </li>
      )}
    </ol>
  )
}
