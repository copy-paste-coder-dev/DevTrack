import { CalendarClock } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({
  onAdd,
  title = 'No activities logged for this day.',
  description = 'Make room for your first block of focused work.',
  disabled = false,
}: {
  onAdd: () => void
  title?: string
  description?: string
  disabled?: boolean
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <CalendarClock size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      <Button variant="secondary" onClick={onAdd} disabled={disabled}>
        Log first activity
      </Button>
    </div>
  )
}
