import { useState } from 'react'
import type { EodTaskGroup } from '../types/eod.types'
import type { TimeFormat } from '../../settings/types/preferences'
import { Card } from '../../../components/ui/Card'
import { ActivityTypeIcon } from '../../activities/components/ActivityTypeIcon'
import { StatusBadge } from '../../activities/components/StatusBadge'
import { activityMeta } from '../../activities/config/presentation'
import { formatDuration } from '../../../utils/duration'
import { formatTime } from '../../settings/utils/timeFormat'

function SessionNotes({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="eod-notes">
      <p className={expanded ? '' : 'eod-notes-preview'}>{notes}</p>
      {(notes.length > 100 || notes.includes('\n')) && (
        <button
          type="button"
          className="button button-ghost"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less notes' : 'Show full notes'}
        </button>
      )}
    </div>
  )
}

export function EodTaskGroupCard({
  group,
  timeFormat,
}: {
  group: EodTaskGroup
  timeFormat: TimeFormat
}) {
  const mixedStatuses = new Set(group.sessions.map((s) => s.status)).size > 1
  return (
    <Card className="eod-panel eod-task">
      <div className="eod-task-header">
        <ActivityTypeIcon type={group.activityType} />
        <div className="eod-task-name">
          <h3>{group.taskName}</h3>
          <p>{activityMeta[group.activityType].label}</p>
        </div>
        <StatusBadge status={group.finalStatus} />
      </div>
      <div className="eod-task-total">
        <strong>Total Duration: {formatDuration(group.totalDurationMinutes)}</strong>
        <span className="count-badge">
          {group.sessionCount} {group.sessionCount === 1 ? 'session' : 'sessions'}
        </span>
      </div>
      <details className="eod-sessions" open={group.sessionCount <= 3}>
        <summary>Individual Sessions ({group.sessionCount})</summary>
        <ol>
          {group.sessions.map((session) => (
            <li key={session.activityId}>
              <div className="eod-session-row">
                <span>
                  {formatTime(session.startAt, timeFormat)}–{formatTime(session.endAt, timeFormat)}
                </span>
                <strong>{formatDuration(session.durationMinutes)}</strong>
                {mixedStatuses && <StatusBadge status={session.status} />}
              </div>
              {session.notes && <SessionNotes notes={session.notes} />}
            </li>
          ))}
        </ol>
      </details>
    </Card>
  )
}
