import { z } from 'zod'
import { getDefaultUserPreferences } from '../config/defaultPreferences.ts'
import { userPreferencesSchema } from '../validation/preferences.schema.ts'
import type { UserPreferences } from '../types/preferences.ts'

// Only absent fields use defaults. Invalid stored values surface a read error and safe app fallback.
export function mapUserPreferences(raw: unknown): UserPreferences {
  const data = z.record(z.string(), z.unknown()).parse(raw)
  const defaults = getDefaultUserPreferences()
  return userPreferencesSchema.parse({
    dayStartTime: data.dayStartTime === undefined ? defaults.dayStartTime : data.dayStartTime,
    dayEndTime: data.dayEndTime === undefined ? defaults.dayEndTime : data.dayEndTime,
    timeFormat: data.timeFormat === undefined ? defaults.timeFormat : data.timeFormat,
    enabledActivityTypes:
      data.enabledActivityTypes === undefined
        ? defaults.enabledActivityTypes
        : data.enabledActivityTypes,
  })
}
