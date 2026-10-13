import { useId, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { activityStatuses, activityTypes, type Activity } from '../types/activity'
import { activityMeta, statusMeta } from '../config/presentation'
import { activityFormSchema, type ActivityFormValues } from '../validation/activity.schema'
import {
  describeActivityConflict,
  findOverlappingActivity,
  parseTimeRange,
  suggestEndTime,
} from '../domain/activityTime'
import { formatDuration } from '../../../utils/duration'

interface ActivityFormProps {
  mode: 'create' | 'edit'
  initialValues: ActivityFormValues
  activities: Activity[]
  excludeActivityId?: string
  startHint?: string
  preserveEndOnStartChange: boolean
  onSubmit: (values: ActivityFormValues) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
  busy: boolean
  error: string | null
}
export function ActivityForm({
  mode,
  initialValues,
  activities,
  excludeActivityId,
  startHint,
  preserveEndOnStartChange,
  onSubmit,
  onCancel,
  onDelete,
  busy,
  error,
}: ActivityFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: initialValues,
  })
  const endEdited = useRef(preserveEndOnStartChange)
  const [date, start, end] = useWatch({ control, name: ['date', 'start', 'end'] })
  const range = parseTimeRange(date, start, end)
  const conflict = range.valid
    ? findOverlappingActivity(
        { dateKey: date, startAt: range.startAt, endAt: range.endAt },
        activities,
        excludeActivityId,
      )
    : undefined
  const conflictId = useId()
  const startField = register('start')
  const endField = register('end')
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
            hint={startHint}
            error={errors.start?.message}
            {...startField}
            aria-invalid={Boolean(errors.start || conflict)}
            aria-describedby={conflict ? conflictId : undefined}
            onChange={(event) => {
              void startField.onChange(event)
              if (!endEdited.current)
                setValue('end', suggestEndTime(event.target.value), { shouldValidate: true })
            }}
          />
          <Input
            label="End time"
            type="time"
            required
            error={errors.end?.message}
            {...endField}
            onChange={(event) => {
              endEdited.current = true
              void endField.onChange(event)
            }}
            aria-invalid={Boolean(errors.end || conflict)}
            aria-describedby={conflict ? conflictId : undefined}
          />
        </div>
        <p
          className={`duration-preview ${range.valid ? '' : 'invalid'}`}
          role="status"
          aria-live="polite"
        >
          Duration{' '}
          <strong>
            {range.valid ? formatDuration(range.durationMinutes) : 'Invalid time range'}
          </strong>
        </p>
        {conflict && (
          <p id={conflictId} className="time-conflict" role="alert">
            {describeActivityConflict(conflict)}
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {date !== initialValues.date && (
          <p className="field-hint">Destination-day conflicts are checked when you save.</p>
        )}
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
          <Button type="submit" loading={busy} disabled={Boolean(conflict)}>
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
    </form>
  )
}
