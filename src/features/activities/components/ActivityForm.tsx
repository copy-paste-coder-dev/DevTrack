import { useId, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { activityStatuses, type Activity } from '../types/activity'
import { activityMeta, statusMeta } from '../config/presentation'
import { activityFormSchema, type ActivityFormValues } from '../validation/activity.schema'
import {
  describeActivityConflict,
  findOverlappingActivity,
  parseTimeRange,
  suggestEndTime,
} from '../domain/activityTime'
import { formatDuration } from '../../../utils/duration'
import { useUserPreferences } from '../../settings/hooks/useUserPreferences'
import { getActivityTypeOptions } from '../../settings/utils/activityTypeOptions'
import { formatTime } from '../../settings/utils/timeFormat'
import { RecentTaskInput } from './RecentTaskInput'
import { isSaveShortcut } from '../../productivity/utils/keyboard'
import { ShortcutHint } from '../../productivity/components/ShortcutHint'

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
  const { preferences } = useUserPreferences()
  const options = getActivityTypeOptions(
    preferences.enabledActivityTypes,
    mode === 'edit' ? initialValues.type : undefined,
  )
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
  const type = useWatch({ control, name: 'type' })
  const name = useWatch({ control, name: 'name' })
  const typeAvailable = options.some((option) => option.type === type)
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
  const submitForm = handleSubmit(async (values) => {
    if (busy || conflict || !typeAvailable) return
    await onSubmit(values)
  })
  return (
    <form
      onSubmit={submitForm}
      onKeyDown={(event) => {
        if (!isSaveShortcut(event.nativeEvent)) return
        event.preventDefault()
        event.stopPropagation()
        if (!busy) void submitForm()
      }}
      noValidate
    >
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
          {!typeAvailable && (
            <option value={type} disabled>
              {activityMeta[type].label} · Choose an enabled type
            </option>
          )}
          {options.map(({ type, isDisabled }) => (
            <option value={type} key={type}>
              {activityMeta[type].label}
              {isDisabled ? ' (currently disabled)' : ''}
            </option>
          ))}
        </Select>
        <div className="quick-types" role="group" aria-label="Quick types">
          {(['jira_task', 'development', 'scrum_call', 'meeting', 'break'] as const)
            .filter((item) => preferences.enabledActivityTypes.includes(item))
            .map((item) => (
              <Button
                key={item}
                variant="ghost"
                aria-pressed={type === item}
                onClick={() => setValue('type', item, { shouldDirty: true, shouldValidate: true })}
              >
                {activityMeta[item].label}
              </Button>
            ))}
        </div>
        <RecentTaskInput
          field={register('name')}
          value={name}
          error={errors.name?.message}
          enabled={mode === 'create'}
          onChoose={(suggestion) => {
            setValue('name', suggestion.taskName, { shouldDirty: true, shouldValidate: true })
            if (preferences.enabledActivityTypes.includes(suggestion.activityType))
              setValue('type', suggestion.activityType, { shouldDirty: true, shouldValidate: true })
          }}
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
        <div className="duration-actions" role="group" aria-label="Quick duration">
          {[15, 30, 60, 120].map((minutes) => (
            <Button
              key={minutes}
              variant="ghost"
              disabled={!suggestEndTime(start, minutes)}
              aria-pressed={range.valid && range.durationMinutes === minutes}
              onClick={() => {
                endEdited.current = true
                setValue('end', suggestEndTime(start, minutes), {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
            >
              +{formatDuration(minutes)}
            </Button>
          ))}
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
            {describeActivityConflict(conflict, (date) => formatTime(date, preferences.timeFormat))}
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
          <Button type="submit" loading={busy} disabled={Boolean(conflict) || !typeAvailable}>
            {busy
              ? mode === 'edit'
                ? 'Updating…'
                : 'Saving…'
              : mode === 'edit'
                ? 'Update activity'
                : 'Save activity'}
            <ShortcutHint>Ctrl/⌘ ↵</ShortcutHint>
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
