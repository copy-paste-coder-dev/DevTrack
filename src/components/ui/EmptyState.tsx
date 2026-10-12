import { CalendarClock } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <CalendarClock size={26} />
      </span>
      <h3>A fresh page for your day</h3>
      <p>No sample activities on this date. Preview an activity to see how logging will feel.</p>
      <Button variant="secondary" onClick={onAdd}>
        Preview an activity
      </Button>
    </div>
  )
}
