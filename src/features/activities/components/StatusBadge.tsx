import { statusMeta } from '../config/presentation'
import type { ActivityStatus } from '../types/activity'

export function StatusBadge({ status }: { status: ActivityStatus }) {
  const meta = statusMeta[status]
  return (
    <span className={`status-badge ${meta.className}`}>
      <span />
      {meta.label}
    </span>
  )
}
