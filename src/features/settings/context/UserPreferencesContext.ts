import { createContext } from 'react'
import type { UserPreferences, UpdateUserPreferencesInput } from '../types/preferences'

export interface UserPreferencesContextValue {
  preferences: UserPreferences
  isLoading: boolean
  error: string | null
  retry: () => void
  isSaving: boolean
  updatePreferences: (input: UpdateUserPreferencesInput) => Promise<UserPreferences>
}
export const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(
  undefined,
)
