import { Card } from '../../../components/ui/Card'
import { formatDuration } from '../../../utils/duration'
import type { MonthAnalysis } from '../../analytics/types/analytics'

export function MonthSummary({ analysis }: { analysis: MonthAnalysis }) {
  const metrics = [
    ['Logged this month', formatDuration(analysis.totalLoggedMinutes)],
    ['Active days', String(analysis.activeDayCount)],
    ['Target met days', String(analysis.targetMetDayCount)],
    ['Avg / active day', formatDuration(Math.round(analysis.averageLoggedMinutesPerActiveDay))],
  ]
  return (
    <Card className="month-summary" aria-label="Month summary">
      <dl>
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>Logged totals include future dates. Target met days count today and past dates.</p>
    </Card>
  )
}
