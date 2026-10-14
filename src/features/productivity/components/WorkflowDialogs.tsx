import { Dialog } from '../../../components/ui/Dialog'
import { ActivityDialog } from '../../activities/components/ActivityDialog'
import type { Activity } from '../../activities/types/activity'
import type { useActivityWorkflow } from '../hooks/useActivityWorkflow'

export function WorkflowDialogs({
  workflow,
  dateKey,
  activities,
}: {
  workflow: ReturnType<typeof useActivityWorkflow>
  dateKey: string
  activities: Activity[]
}) {
  if (workflow.helpOpen)
    return (
      <Dialog title="Keyboard shortcuts" onClose={workflow.close}>
        <dl className="shortcut-help">
          {[
            ['N', 'New activity'],
            ['Ctrl / ⌘ + Enter', 'Save activity'],
            ['Esc', 'Close the current menu or dialog'],
            ['T', 'Today'],
            ['Alt + ← / →', 'Previous / next day'],
            ['?', 'Shortcut help'],
          ].map(([keys, label]) => (
            <div key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <p className="field-hint">
          Dashboard and Calendar only. Letter and date shortcuts pause while typing or using a
          menu/dialog.
        </p>
      </Dialog>
    )
  return workflow.dialog ? (
    <ActivityDialog
      {...workflow.dialog}
      dateKey={dateKey}
      activities={activities}
      onClose={workflow.close}
    />
  ) : null
}
