import type { EodSummary } from '../types/eod.types'
import type { TimeFormat } from '../../settings/types/preferences'
import { EodTaskGroupCard } from './EodTaskGroupCard'

export function EodTaskSections({
  summary,
  timeFormat,
}: {
  summary: EodSummary
  timeFormat: TimeFormat
}) {
  return (
    <div className="eod-stack">
      {[
        { label: 'Completed Work', groups: summary.completedGroups },
        { label: 'In Progress', groups: summary.inProgressGroups },
        { label: 'On Hold', groups: summary.onHoldGroups },
      ]
        .filter((section) => section.groups.length)
        .map((section) => (
          <section className="eod-stack" key={section.label} aria-label={section.label}>
            <h2>
              {section.label} <span className="count-badge">{section.groups.length}</span>
            </h2>
            {section.groups.map((group) => (
              <EodTaskGroupCard key={group.key} group={group} timeFormat={timeFormat} />
            ))}
          </section>
        ))}
    </div>
  )
}
