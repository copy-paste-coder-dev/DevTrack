import { z } from 'zod'
import { activityStatuses, activityTypes } from '../types/activity.ts'
import { combineDateAndTime, isDateKey } from '../../../utils/date.ts'
import { parseTimeRange, validateTimeRange } from '../domain/activityTime.ts'

export const activityInputSchema = z
  .object({
    dateKey: z.string().refine(isDateKey, 'Choose a valid date.'),
    activityType: z.enum(activityTypes),
    taskName: z
      .string()
      .trim()
      .min(1, 'Give your activity a name.')
      .max(160, 'Use 160 characters or fewer.'),
    status: z.enum(activityStatuses),
    startAt: z.date(),
    endAt: z.date(),
    notes: z.string().trim().max(1000, 'Use 1,000 characters or fewer.').optional().default(''),
  })
  .superRefine((input, ctx) => {
    const range = validateTimeRange(input.startAt, input.endAt, input.dateKey, true)
    if (!range.valid)
      ctx.addIssue({
        code: 'custom',
        path: ['endAt'],
        message: range.message,
      })
  })

export const activityFormSchema = z
  .object({
    date: z.string().refine(isDateKey, 'Choose a valid date.'),
    type: z.enum(activityTypes),
    name: z
      .string()
      .trim()
      .min(1, 'Give your activity a name.')
      .max(160, 'Use 160 characters or fewer.'),
    status: z.enum(activityStatuses),
    start: z
      .string()
      .min(1, 'Choose a start time.')
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid start time.'),
    end: z
      .string()
      .min(1, 'Choose an end time.')
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid end time.'),
    notes: z.string().max(1000, 'Use 1,000 characters or fewer.'),
  })
  .superRefine((value, ctx) => {
    const range = parseTimeRange(value.date, value.start, value.end)
    if (!range.valid) {
      ctx.addIssue({
        code: 'custom',
        path: ['end'],
        message: range.message,
      })
    }
  })
export type ActivityFormValues = z.infer<typeof activityFormSchema>
export function mapFormToActivityInput(values: ActivityFormValues) {
  return activityInputSchema.parse({
    dateKey: values.date,
    activityType: values.type,
    taskName: values.name,
    status: values.status,
    startAt: combineDateAndTime(values.date, values.start),
    endAt: combineDateAndTime(values.date, values.end),
    notes: values.notes,
  })
}
