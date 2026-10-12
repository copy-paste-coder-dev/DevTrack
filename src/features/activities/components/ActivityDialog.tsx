import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog } from '../../../components/ui/Dialog'
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog'
import { ActivityForm } from './ActivityForm'
import type { Activity } from '../types/activity'

export interface DialogSelection {
  activity: Activity | null
  action?: 'edit' | 'delete'
}
interface ActivityDialogProps extends DialogSelection {
  dateKey: string
  onClose: () => void
}
export function ActivityDialog({
  activity,
  action = 'edit',
  dateKey,
  onClose,
}: ActivityDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState(action === 'delete')
  if (confirmDelete && activity)
    return (
      <ConfirmationDialog
        title="Delete activity?"
        onCancel={onClose}
        onConfirm={() => {
          toast.info('Delete preview complete', {
            description: 'No sample activities were removed.',
          })
          onClose()
        }}
      >
        <p>
          Are you sure you want to delete <strong>{activity.name}</strong>?
        </p>
        <p className="confirmation-note">
          Preview only. This sample activity will remain in your timeline.
        </p>
      </ConfirmationDialog>
    )

  return (
    <Dialog
      title={activity ? 'Edit activity' : 'Add activity'}
      eyebrow="YOUR DAY, ONE BLOCK AT A TIME"
      onClose={onClose}
    >
      <ActivityForm
        mode={activity ? 'edit' : 'create'}
        initialValues={{
          date: activity?.dateKey ?? dateKey,
          type: activity?.type ?? 'development',
          name: activity?.name ?? '',
          status: activity?.status ?? 'in_progress',
          start: activity?.start ?? '09:00',
          end: activity?.end ?? '10:00',
          notes: activity?.notes ?? '',
        }}
        onSubmit={() => {
          toast.success('Activity preview validated', {
            description: 'Preview only. Your sample timeline has not changed.',
          })
          onClose()
        }}
        onCancel={onClose}
        onDelete={activity ? () => setConfirmDelete(true) : undefined}
      />
    </Dialog>
  )
}
