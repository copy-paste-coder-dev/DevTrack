import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { activityStatuses, activityTypes } from '../types/activity'
import { activityMeta, statusMeta } from '../config/presentation'

const schema = z.object({
  date: z.string().min(1, 'Choose a date.'),
  type: z.enum(activityTypes),
  name: z
    .string()
    .trim()
    .min(1, 'Give your activity a name.')
    .max(160, 'Use 160 characters or fewer.'),
  status: z.enum(activityStatuses),
  start: z.string().min(1, 'Choose a start time.'),
  end: z.string().min(1, 'Choose an end time.'),
  notes: z.string().max(1000, 'Use 1,000 characters or fewer.'),
})
export type ActivityFormValues = z.infer<typeof schema>
interface ActivityFormProps {
  mode: 'create' | 'edit'
  initialValues: ActivityFormValues
  onSubmit: (values: ActivityFormValues) => void
  onCancel: () => void
  onDelete?: () => void
}
export function ActivityForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  onDelete,
}: ActivityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivityFormValues>({ resolver: zodResolver(schema), defaultValues: initialValues })
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="required-note">
        Fields marked <span aria-hidden="true">*</span> are required.
      </p>
      <Input label="Date" type="date" required error={errors.date?.message} {...register('date')} />
      <Select label="Activity type" required {...register('type')}>
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
      <Select label="Task status" required {...register('status')}>
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
      <div className="form-info">
        <Info size={16} />
        <p>This is a UI preview. Activity changes are not saved.</p>
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
        <Button type="submit">{mode === 'edit' ? 'Update activity' : 'Save activity'}</Button>
      </div>
    </form>
  )
}
