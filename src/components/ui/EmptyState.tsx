import { CalendarClock } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({
  onAdd,
  title = 'No activities logged for this day.',
}: {
  onAdd: () => void
  title?: string
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <CalendarClock size={26} />
      </span>
      <h3>{title}</h3>
      <p>Make room for your first block of focused work.</p>
      <Button variant="secondary" onClick={onAdd}>
        Log first activity
      </Button>
    </div>
  )
}
