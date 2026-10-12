import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from './StatusBadge'
import { ActivityTypeBadge, ActivityTypeIcon } from './ActivityTypeIcon'
import { activityMeta } from '../config/presentation'
import type { Activity } from '../types/activity'
import { formatDuration } from '../../../utils/duration'

export interface ActivityCardProps {
  activity: Activity
  onEdit: (activity: Activity) => void
  onDelete: (activity: Activity) => void
}
export function ActivityCard({ activity, onEdit, onDelete }: ActivityCardProps) {
  const meta = activityMeta[activity.type]
  return (
    <div className={`activity-block tone-${meta.color}`}>
      <ActivityTypeIcon type={activity.type} />
      <div className="activity-content">
        <div className="activity-title">
          <ActivityTypeBadge type={activity.type} />
          <StatusBadge status={activity.status} />
        </div>
        <p>{activity.name}</p>
        <div className="activity-time">
          <span>
            {activity.start} <span className="time-dash">—</span> {activity.end}
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
