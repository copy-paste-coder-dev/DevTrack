import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '../ui/Button'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry: () => void
}
export function ErrorState({
  title = 'Unable to load your activity data.',
  description = 'Your workspace is still here. Try loading the day again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="empty-state error-state" role="alert">
      <span className="empty-icon">
        <AlertTriangle size={26} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Button variant="secondary" onClick={onRetry}>
        <RotateCcw size={15} />
        Try again
      </Button>
    </div>
  )
}
