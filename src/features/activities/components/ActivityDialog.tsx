import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/Input'
import { activityStatuses, activityTypes } from '../types/activity'
import { activityMeta, statusMeta, type DemoActivity } from '../data/demo'

const schema = z
  .object({
    date: z.string().min(1, 'Choose a date.'),
    type: z.enum(activityTypes),
    name: z
      .string()
      .trim()
      .min(1, 'Give your activity a name.')
      .max(160, 'Use 160 characters or fewer.'),
    status: z.enum(activityStatuses),
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a start time.'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Choose an end time.'),
    notes: z.string().max(1000, 'Use 1,000 characters or fewer.'),
  })
  .refine((value) => value.end > value.start, {
    message: 'End time must be after start time.',
    path: ['end'],
  })
type ActivityForm = z.infer<typeof schema>
export interface DialogSelection {
  activity: DemoActivity | null
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
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const notesId = useId()
  const [confirmDelete, setConfirmDelete] = useState(action === 'delete')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivityForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: dateKey,
      type: activity?.type ?? 'development',
      name: activity?.name ?? '',
      status: activity?.status ?? 'in_progress',
      start: activity?.start ?? '09:00',
      end: activity?.end ?? '10:00',
      notes: activity?.notes ?? '',
    },
  })
  useEffect(() => {
    const previousFocus = document.activeElement
    const element = dialog.current
    element?.showModal()
    return () => {
      element?.close()
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])
  function preview() {
    toast.success('Activity preview validated', {
      description: 'Preview only. Your sample timeline has not changed.',
    })
    onClose()
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="activity-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-header">
        <div>
          <span className="eyebrow">YOUR DAY, ONE BLOCK AT A TIME</span>
          <h2 id={titleId}>
            {confirmDelete ? 'Delete activity?' : activity ? 'Edit activity' : 'Add activity'}
          </h2>
        </div>
        <Button variant="ghost" className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      {confirmDelete ? (
        <div className="delete-confirmation">
          <p>
            Preview deleting <strong>{activity?.name}</strong>. This sample activity will remain in
            the timeline.
          </p>
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Go back
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                toast.info('Delete preview complete', {
                  description: 'No sample activities were removed.',
                })
                onClose()
              }}
            >
              Confirm delete preview
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(preview)} noValidate>
          <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
          <Select label="Activity type" {...register('type')}>
            {activityTypes.map((type) => (
              <option value={type} key={type}>
                {activityMeta[type].label}
              </option>
            ))}
          </Select>
          <Input
            label="Task / activity name"
            placeholder="What are you working on?"
            autoComplete="off"
            error={errors.name?.message}
            {...register('name')}
          />
          <Select label="Task status" {...register('status')}>
            {activityStatuses.map((status) => (
              <option value={status} key={status}>
                {statusMeta[status].label}
              </option>
            ))}
          </Select>
          <div className="form-row">
            <Input
              label="Start time"
              type="time"
              error={errors.start?.message}
              {...register('start')}
            />
            <Input label="End time" type="time" error={errors.end?.message} {...register('end')} />
          </div>
          <div className="form-info">
            <Info size={16} />
            <p>This is a UI preview. Activity changes are not saved.</p>
          </div>
          <div className="field">
            <label htmlFor={notesId}>
              Notes <span>(optional)</span>
            </label>
            <textarea
              id={notesId}
              rows={3}
              placeholder="A little context for your future self…"
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? `${notesId}-error` : undefined}
              {...register('notes')}
            />
            {errors.notes && (
              <span id={`${notesId}-error`} className="field-error">
                {errors.notes.message}
              </span>
            )}
          </div>
          <div className="dialog-actions">
            {activity && (
              <Button
                variant="ghost"
                className="delete-button"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={15} />
                Delete
              </Button>
            )}
            <div className="action-spacer" />
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{activity ? 'Update preview' : 'Save preview'}</Button>
          </div>
        </form>
      )}
    </dialog>
  )
}
