import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'

export function StatsSkeleton() {
  return (
    <div className="stats-grid" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <Card className="stat-card" key={index}>
          <Skeleton className="skeleton-label" />
          <Skeleton className="skeleton-value" />
        </Card>
      ))}
    </div>
  )
}
export function TimelineSkeleton() {
  return (
    <div className="timeline-skeleton" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="activity-block" key={index}>
          <Skeleton className="skeleton-icon" />
          <div className="skeleton-copy">
            <Skeleton className="skeleton-label" />
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-meta" />
          </div>
        </div>
      ))}
    </div>
  )
}
export function CalendarSkeleton() {
  return (
    <div className="calendar-skeleton" aria-hidden="true">
      <Skeleton className="skeleton-label" />
      <div className="calendar-grid">
        {Array.from({ length: 35 }, (_, index) => (
          <Skeleton className="skeleton-day" key={index} />
        ))}
      </div>
    </div>
  )
}
export function DashboardSkeleton() {
  return (
    <div className="dashboard-grid" role="status" aria-label="Loading activity data">
      <div className="day-context">
        <Card>
          <CalendarSkeleton />
        </Card>
        <Card className="day-summary">
          <Skeleton className="skeleton-label" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line" />
        </Card>
      </div>
      <Card className="timeline-card">
        <Skeleton className="skeleton-label" />
        <TimelineSkeleton />
      </Card>
    </div>
  )
}
export function CalendarLoadingState() {
  return (
    <div className="calendar-page-grid" role="status" aria-label="Loading calendar data">
      <Card className="calendar-main">
        <CalendarSkeleton />
      </Card>
      <Card className="selected-day-card">
        <TimelineSkeleton />
      </Card>
    </div>
  )
}
export function SettingsSkeleton() {
  return (
    <Card className="settings-card" role="status" aria-label="Loading settings">
      <Skeleton className="skeleton-label" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton className="skeleton-line" key={index} />
      ))}
    </Card>
  )
}
