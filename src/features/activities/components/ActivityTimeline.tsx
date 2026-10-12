import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from './StatusBadge'
import { EmptyState } from '../../../components/ui/EmptyState'
import { activityMeta, type DemoActivity } from '../data/demo'
import type { DialogSelection } from './ActivityDialog'

interface ActivityTimelineProps {
  activities: DemoActivity[]
  onOpen: (selection: DialogSelection) => void
  compact?: boolean
}
export function ActivityTimeline({ activities, onOpen, compact = false }: ActivityTimelineProps) {
  if (!activities.length) return <EmptyState onAdd={() => onOpen({ activity: null })} />
  return (
    <ol className={`activity-timeline ${compact ? 'compact' : ''}`} aria-label="Daily activities">
      {activities.map((activity) => {
        const meta = activityMeta[activity.type]
        const Icon = meta.icon
        return (
          <li className={`timeline-item tone-${meta.color}`} key={activity.id}>
            <span className="timeline-time">{activity.start}</span>
            <span className="timeline-dot" />
            <div className="activity-block">
              <span className="activity-icon">
                <Icon size={21} strokeWidth={1.8} />
              </span>
              <div className="activity-content">
                <div className="activity-title">
                  <h3>{meta.label}</h3>
                  <StatusBadge status={activity.status} />
                </div>
                <p>{activity.name}</p>
                <div className="activity-time">
                  <span>
                    {activity.start} <span className="time-dash">—</span> {activity.end}
                  </span>
                  <span className="duration-chip">{activity.duration}</span>
                </div>
              </div>
              <div className="activity-actions">
                <Button
                  variant="ghost"
                  className="icon-button"
                  aria-label={`Edit ${meta.label}`}
                  onClick={() => onOpen({ activity })}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  className="icon-button danger-hover"
                  aria-label={`Delete ${meta.label}`}
                  onClick={() => onOpen({ activity, action: 'delete' })}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </li>
        )
      })}
      {!compact && (
        <li className="timeline-end">
          <span>{activities.at(-1)?.end}</span>
          <i />
          <span>You made room for good work.</span>
        </li>
      )}
    </ol>
  )
}
