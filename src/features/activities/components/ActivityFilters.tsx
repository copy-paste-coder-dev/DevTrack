import { Input, Select } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { activityStatuses, type ActivityStatus } from '../types/activity'
import { statusMeta } from '../config/presentation'

export function ActivityFilters({
  search,
  status,
  onSearch,
  onStatus,
  onClear,
}: {
  search: string
  status: ActivityStatus | 'all'
  onSearch: (value: string) => void
  onStatus: (value: ActivityStatus | 'all') => void
  onClear: () => void
}) {
  return (
    <div className="activity-filters" role="search" aria-label="Filter selected-day activities">
      <Input
        label="Search activities"
        type="search"
        value={search}
        placeholder="Task, type or status…"
        onChange={(event) => onSearch(event.target.value)}
      />
      <Select
        label="Filter status"
        value={status}
        onChange={(event) => onStatus(event.target.value as ActivityStatus | 'all')}
      >
        <option value="all">All statuses</option>
        {activityStatuses.map((item) => (
          <option key={item} value={item}>
            {statusMeta[item].label}
          </option>
        ))}
      </Select>
      {(search || status !== 'all') && (
        <Button variant="ghost" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
