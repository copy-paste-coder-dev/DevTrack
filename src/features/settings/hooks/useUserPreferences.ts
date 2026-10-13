import { useContext } from 'react'
import { UserPreferencesContext } from '../context/UserPreferencesContext'

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (!context) throw new Error('useUserPreferences must be used inside UserPreferencesProvider.')
  return context
}
