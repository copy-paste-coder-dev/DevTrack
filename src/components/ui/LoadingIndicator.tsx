import { LoaderCircle } from 'lucide-react'
export function LoadingIndicator({
  label = 'Loading workspace',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <span role="status" className={`loading ${className}`}>
      <LoaderCircle size={18} className="spinner" />
      <span>{label}</span>
    </span>
  )
}
