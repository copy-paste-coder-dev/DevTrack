import type { AiEodInput } from '../../../../functions/shared/eodAi.ts'
import type { EodSummary } from '../types/eod.types.ts'
import { formatDuration } from '../../../utils/duration.ts'

// Explicit allowlist: no document IDs, identity, timestamps, metadata, or session notes.
export function buildAiEodInput(summary: EodSummary): AiEodInput {
  return {
    date: summary.dateKey,
    totalLogged: formatDuration(summary.totalLoggedMinutes),
    target: formatDuration(summary.workdayTargetMinutes),
    remaining: formatDuration(summary.remainingMinutes),
    overtime: formatDuration(summary.overtimeMinutes),
    sessionCount: summary.activitySessionCount,
    tasks: [...summary.completedGroups, ...summary.inProgressGroups, ...summary.onHoldGroups]
      .sort((a, b) => a.firstStartAt.getTime() - b.firstStartAt.getTime())
      .map((group) => ({
        taskName: group.taskName.replace(/\s+/gu, ' ').trim(),
        activityType: group.activityType,
        status: group.finalStatus,
        totalDuration: formatDuration(group.totalDurationMinutes),
        sessionCount: group.sessionCount,
      })),
    gaps: { count: summary.gapCount, totalDuration: formatDuration(summary.totalGapMinutes) },
  }
}
