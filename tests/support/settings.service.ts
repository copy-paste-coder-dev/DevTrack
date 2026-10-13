// Isolated synthetic settings backend, excluded from ordinary development/production builds.
import type {
  SettingsService,
  UserPreferences,
} from '../../src/features/settings/types/preferences'
import { getDefaultUserPreferences } from '../../src/features/settings/config/defaultPreferences'
import { mapUserPreferences } from '../../src/features/settings/utils/preferences.mapper'
import { userPreferencesSchema } from '../../src/features/settings/validation/preferences.schema'

const key = 'devtrack-e2e-preferences'
const listeners = new Set<() => void>()
function read(uid: string): UserPreferences | null {
  const data = JSON.parse(localStorage.getItem(key) ?? '{}')[uid]
  return data ? mapUserPreferences(data) : null
}
function options(): {
  readError?: string
  saveError?: string
  delay?: number
  holdSave?: boolean
  loading?: boolean
} {
  return JSON.parse(localStorage.getItem('devtrack-e2e-preferences-options') ?? '{}')
}
function write(uid: string, values: UserPreferences) {
  const store = JSON.parse(localStorage.getItem(key) ?? '{}')
  const now = new Date().toISOString()
  localStorage.setItem(
    key,
    JSON.stringify({
      ...store,
      [uid]: { ...values, createdAt: store[uid]?.createdAt ?? now, updatedAt: now },
    }),
  )
  for (const callback of listeners) callback()
}
export const settingsService: SettingsService = {
  async getUserPreferences(uid) {
    if (options().readError) throw { code: options().readError }
    return read(uid)
  },
  async createDefaultUserPreferences(uid) {
    if (!read(uid)) write(uid, getDefaultUserPreferences())
  },
  async updateUserPreferences(uid, input) {
    if (!navigator.onLine) throw { code: 'app/offline' }
    const values = userPreferencesSchema.parse(input)
    const config = options()
    const deadline = Date.now() + 15000
    while (options().holdSave && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 25))
    await new Promise((resolve) => setTimeout(resolve, config.delay ?? 25))
    if (config.saveError) throw { code: config.saveError }
    write(uid, values)
    return values
  },
  subscribeToUserPreferences(uid, next, error) {
    let active = true
    const callback = () => {
      if (!active || options().loading) return
      try {
        if (options().readError) throw { code: options().readError }
        next(read(uid))
      } catch (cause) {
        error(cause)
      }
    }
    listeners.add(callback)
    sessionStorage.setItem('devtrack-e2e-preferences-listeners', String(listeners.size))
    const timer = setTimeout(callback, options().delay ?? 20)
    const remote = (event: StorageEvent) => {
      if (event.key === key || event.key === 'devtrack-e2e-preferences-options') callback()
    }
    window.addEventListener('storage', remote)
    return () => {
      active = false
      clearTimeout(timer)
      listeners.delete(callback)
      window.removeEventListener('storage', remote)
      sessionStorage.setItem('devtrack-e2e-preferences-listeners', String(listeners.size))
    }
  },
}
