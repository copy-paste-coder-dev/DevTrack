import type { ActivityType } from '../types/activity'
import { activityMeta } from '../config/presentation'

export function ActivityTypeIcon({ type }: { type: ActivityType }) {
  const { icon: Icon, color } = activityMeta[type]
  return (
    <span className={`activity-icon tone-${color}`} aria-hidden="true">
      <Icon size={21} strokeWidth={1.8} />
    </span>
  )
}
export function ActivityTypeBadge({ type }: { type: ActivityType }) {
  return (
    <h3 className={`activity-type-badge tone-${activityMeta[type].color}`}>
      {activityMeta[type].label}
    </h3>
  )
}
