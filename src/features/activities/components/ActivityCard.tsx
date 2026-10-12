import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from './StatusBadge'
import { ActivityTypeBadge, ActivityTypeIcon } from './ActivityTypeIcon'
import { activityMeta } from '../config/presentation'
import type { Activity } from '../types/activity'
import { formatDuration } from '../../../utils/duration'
import { formatDisplayTime } from '../../../utils/date'

export interface ActivityCardProps {
  activity: Activity
  onEdit: (activity: Activity) => void
  onDelete: (activity: Activity) => void
}
export function ActivityCard({ activity, onEdit, onDelete }: ActivityCardProps) {
  const meta = activityMeta[activity.activityType]
  return (
    <div className={`activity-block tone-${meta.color}`}>
      <ActivityTypeIcon type={activity.activityType} />
      <div className="activity-content">
        <div className="activity-title">
          <ActivityTypeBadge type={activity.activityType} />
          <StatusBadge status={activity.status} />
        </div>
        <p>{activity.taskName}</p>
        <div className="activity-time">
          <span>
            {formatDisplayTime(activity.startAt)} <span className="time-dash">—</span>{' '}
            {formatDisplayTime(activity.endAt)}
          </span>
          <span className="duration-chip">{formatDuration(activity.durationMinutes)}</span>
        </div>
      </div>
      <div className="activity-actions">
        <Button
          variant="ghost"
          className="icon-button"
          aria-label={`Edit ${meta.label}`}
          onClick={() => onEdit(activity)}
        >
          <Pencil size={14} />
        </Button>
        <Button
          variant="ghost"
          className="icon-button danger-hover"
          aria-label={`Delete ${meta.label}`}
          onClick={() => onDelete(activity)}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  )
}
