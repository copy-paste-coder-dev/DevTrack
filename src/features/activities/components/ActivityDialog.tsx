import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog } from '../../../components/ui/Dialog'
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog'
import { ActivityForm } from './ActivityForm'
import type { Activity } from '../types/activity'
import { useActivityMutations } from '../hooks/useActivityMutations'
import { mapFormToActivityInput, type ActivityFormValues } from '../validation/activity.schema'
import { getActivityErrorMessage } from '../utils/activityError'
import { formatDisplayTime } from '../../../utils/date'
import { buildCreateActivityDefaults, type ActivityGap } from '../domain/activityTime'
import { useUserPreferences } from '../../settings/hooks/useUserPreferences'
import { getDefaultActivityType } from '../../settings/utils/activityTypeOptions'

export interface DialogSelection {
  activity: Activity | null
  action?: 'edit' | 'delete'
  gap?: ActivityGap
}
interface ActivityDialogProps extends DialogSelection {
  dateKey: string
  activities: Activity[]
  onClose: () => void
}
export function ActivityDialog({
  activity,
  action = 'edit',
  dateKey,
  activities,
  gap,
  onClose,
}: ActivityDialogProps) {
  const { preferences } = useUserPreferences()
  const [confirmDelete, setConfirmDelete] = useState(action === 'delete')
  const [error, setError] = useState<string | null>(null)
  const mutations = useActivityMutations()
  const busy = mutations.isCreating || mutations.isUpdating || mutations.isDeleting
  // Capture defaults once on opening. Realtime updates must never reset a user's draft.
  const [initialValues] = useState<ActivityFormValues>(() =>
    activity
      ? {
          date: activity?.dateKey ?? dateKey,
          type: activity?.activityType ?? 'development',
          name: activity?.taskName ?? '',
          status: activity?.status ?? 'in_progress',
          start: formatDisplayTime(activity.startAt),
          end: formatDisplayTime(activity.endAt),
          notes: activity?.notes ?? '',
        }
      : {
          ...buildCreateActivityDefaults({
            dateKey,
            activities,
            dayStartTime: preferences.dayStartTime,
            gap,
          }),
          type: getDefaultActivityType(preferences.enabledActivityTypes),
        },
  )
  const [startHint] = useState(() =>
    activity
      ? undefined
      : gap
        ? 'Prefilled from this unlogged gap. You can edit these times.'
        : activities.some((a) => a.dateKey === dateKey)
          ? 'Suggested from your previous activity. You can edit this time.'
          : 'Suggested from your configured day start.',
  )
  async function submit(values: ActivityFormValues) {
    if (busy) return
    setError(null)
    try {
      const input = mapFormToActivityInput(values)
      if (
        !preferences.enabledActivityTypes.includes(input.activityType) &&
        input.activityType !== activity?.activityType
      ) {
        setError(
          'Choose an enabled activity type. Your preferences changed while this form was open.',
        )
        return
      }
      if (activity) await mutations.updateActivity(activity.id, input)
      else await mutations.createActivity(input)
      toast.success(activity ? 'Activity updated.' : 'Activity logged.')
      onClose()
    } catch (cause) {
      setError(getActivityErrorMessage(cause))
    }
  }
  async function remove() {
    if (!activity || busy) return
    setError(null)
    try {
      await mutations.deleteActivity(activity.id)
      toast.success('Activity deleted.')
      onClose()
    } catch (cause) {
      setError(getActivityErrorMessage(cause, 'delete'))
    }
  }
  if (confirmDelete && activity)
    return (
      <ConfirmationDialog
        title="Delete activity?"
        busy={busy}
        confirmLabel={busy ? 'Deleting…' : 'Delete'}
        onCancel={onClose}
        onConfirm={remove}
      >
        <p>
          Are you sure you want to delete <strong>{activity.taskName}</strong>?
        </p>
        <p className="confirmation-note">This activity will be permanently deleted.</p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
      </ConfirmationDialog>
    )
  return (
    <Dialog
      title={activity ? 'Edit activity' : 'Add activity'}
      eyebrow="YOUR DAY, ONE BLOCK AT A TIME"
      onClose={onClose}
      busy={busy}
    >
      <ActivityForm
        mode={activity ? 'edit' : 'create'}
        initialValues={initialValues}
        activities={activities}
        excludeActivityId={activity?.id}
        startHint={startHint}
        preserveEndOnStartChange={Boolean(activity || gap)}
        busy={busy}
        error={error}
        onSubmit={submit}
        onCancel={onClose}
        onDelete={
          activity
            ? () => {
                setError(null)
                setConfirmDelete(true)
              }
            : undefined
        }
      />
    </Dialog>
  )
}
