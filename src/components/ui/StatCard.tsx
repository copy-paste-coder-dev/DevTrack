import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone: 'cyan' | 'purple' | 'green' | 'blue' | 'amber'
  detail?: string
}
export function StatCard({ label, value, icon: Icon, tone, detail }: StatCardProps) {
  return (
    <Card className={`stat-card tone-${tone}`}>
      <div className="stat-label">
        <span>{label}</span>
        <Icon size={17} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      {detail && <span className="stat-detail">{detail}</span>}
    </Card>
  )
}
