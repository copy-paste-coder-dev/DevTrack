import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { activityStatuses, activityTypes } from '../types/activity'
import { activityMeta, statusMeta } from '../config/presentation'
import { activityFormSchema, type ActivityFormValues } from '../validation/activity.schema'

interface ActivityFormProps {
  mode: 'create' | 'edit'
  initialValues: ActivityFormValues
  onSubmit: (values: ActivityFormValues) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
  busy: boolean
  error: string | null
}
export function ActivityForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  onDelete,
  busy,
  error,
}: ActivityFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: initialValues,
  })
  useEffect(() => {
    reset(initialValues)
  }, [initialValues, reset])
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <p className="required-note">
          Fields marked <span aria-hidden="true">*</span> are required.
        </p>
        <Input
          label="Date"
          type="date"
          required
          error={errors.date?.message}
          {...register('date')}
        />
        <Select label="Activity type" required error={errors.type?.message} {...register('type')}>
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
          required
          error={errors.name?.message}
          {...register('name')}
        />
        <Select label="Task status" required error={errors.status?.message} {...register('status')}>
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
            required
            hint="In a later phase, start time will default to the previous activity’s end time. You can edit it."
            error={errors.start?.message}
            {...register('start')}
          />
          <Input
            label="End time"
            type="time"
            required
            error={errors.end?.message}
            {...register('end')}
          />
        </div>
        <Textarea
          label="Notes (optional)"
          rows={3}
          placeholder="A little context for your future self…"
          error={errors.notes?.message}
          {...register('notes')}
        />
        <div className="dialog-actions">
          {mode === 'edit' && onDelete && (
            <Button variant="ghost" className="delete-button" onClick={onDelete}>
              <Trash2 size={15} />
              Delete
            </Button>
          )}
          <div className="action-spacer" />
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {busy
              ? mode === 'edit'
                ? 'Updating…'
                : 'Saving…'
              : mode === 'edit'
                ? 'Update activity'
                : 'Save activity'}
          </Button>
        </div>
      </fieldset>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
