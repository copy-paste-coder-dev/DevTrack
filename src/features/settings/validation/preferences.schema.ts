import { z } from 'zod'
import { activityTypes } from '../../activities/types/activity.ts'
import { isTimeString } from '../../../utils/date.ts'
import { calculateWorkdayMinutes } from '../utils/workday.ts'

export const userPreferencesSchema = z
  .object({
    dayStartTime: z.string().refine(isTimeString, 'Choose a valid start time.'),
    dayEndTime: z.string().refine(isTimeString, 'Choose a valid end time.'),
    timeFormat: z.enum(['12h', '24h']),
    enabledActivityTypes: z
      .array(z.enum(activityTypes))
      .min(1, 'Select at least one activity type.')
      .refine((types) => new Set(types).size === types.length, 'Activity types must be unique.'),
  })
  .superRefine((values, context) => {
    if (!isTimeString(values.dayStartTime) || !isTimeString(values.dayEndTime)) return
    try {
      calculateWorkdayMinutes(values.dayStartTime, values.dayEndTime)
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['dayEndTime'],
        message: 'End time must be later than start time.',
      })
    }
  })
