import { serverTimestamp, Timestamp } from 'firebase/firestore'
import { z } from 'zod'
import {
  activityStatuses,
  activityTypes,
  type Activity,
  type CreateActivityInput,
  type UpdateActivityInput,
} from '../types/activity.ts'
import { activityInputSchema } from '../validation/activity.schema.ts'
import { calculateDurationMinutes } from '../../../utils/duration.ts'
import { validateTimeRange } from '../domain/activityTime.ts'
import { isDateKey } from '../../../utils/date.ts'
import type { ActivityDocument } from '../types/activityDocument.ts'

const timestamp = z.instanceof(Timestamp)
const documentSchema = z.object({
  dateKey: z.string().refine(isDateKey),
  activityType: z.enum(activityTypes),
  taskName: z.string().trim().min(1).max(160),
  status: z.enum(activityStatuses),
  startAt: timestamp,
  endAt: timestamp,
  durationMinutes: z.number().int().positive().lt(1440),
  notes: z.string().max(1000),
  createdAt: timestamp.nullish(),
  updatedAt: timestamp.nullish(),
})
export function mapActivityDocument(id: string, raw: unknown): Activity {
  const parsed = documentSchema.parse(raw)
  const data: ActivityDocument = {
    ...parsed,
    createdAt: parsed.createdAt ?? null,
    updatedAt: parsed.updatedAt ?? null,
  }
  const range = validateTimeRange(data.startAt.toDate(), data.endAt.toDate(), data.dateKey)
  if (!range.valid || range.durationMinutes !== data.durationMinutes)
    throw new Error('The stored activity has invalid times or duration.')
  return {
    ...data,
    id,
    startAt: data.startAt.toDate(),
    endAt: data.endAt.toDate(),
    createdAt: data.createdAt?.toDate() ?? null,
    updatedAt: data.updatedAt?.toDate() ?? null,
  }
}
export function mapActivityToUpdatePayload(input: UpdateActivityInput) {
  const data = activityInputSchema.parse(input)
  return {
    ...data,
    startAt: Timestamp.fromDate(data.startAt),
    endAt: Timestamp.fromDate(data.endAt),
    durationMinutes: calculateDurationMinutes(data.startAt, data.endAt),
    updatedAt: serverTimestamp(),
  }
}
export function mapActivityToCreatePayload(input: CreateActivityInput) {
  return { ...mapActivityToUpdatePayload(input), createdAt: serverTimestamp() }
}
