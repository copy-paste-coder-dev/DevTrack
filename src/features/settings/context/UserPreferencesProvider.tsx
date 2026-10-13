import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { getDefaultUserPreferences } from '../config/defaultPreferences'
import { UserPreferencesContext } from './UserPreferencesContext'
import { getPreferencesErrorMessage } from '../utils/preferencesError'
import type { UserPreferences, UpdateUserPreferencesInput } from '../types/preferences'

// UID key makes logout/account changes discard all previous state before rendering consumers.
export function UserPreferencesProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  return user ? (
    <PreferencesSession key={user.uid} uid={user.uid}>
      {children}
    </PreferencesSession>
  ) : null
}
function PreferencesSession({ uid, children }: PropsWithChildren<{ uid: string }>) {
  const [preferences, setPreferences] = useState<UserPreferences>(getDefaultUserPreferences)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [isSaving, setSaving] = useState(false)
  const saveTask = useRef<Promise<UserPreferences> | null>(null)
  const currentSession = useRef(true)
  useEffect(() => {
    currentSession.current = true
    let active = true
    let initialization: Promise<void> | undefined
    const fail = (cause: unknown) => {
      if (!active) return
      setPreferences(getDefaultUserPreferences())
      setError(getPreferencesErrorMessage(cause, 'read'))
      setLoading(false)
    }
    let unsubscribe: (() => void) | undefined
    // Defer Firebase/settings validation code until the authenticated shell actually mounts.
    void import('#settings-service')
      .then(({ settingsService }) => {
        if (!active) return
        unsubscribe = settingsService.subscribeToUserPreferences(
          uid,
          (values) => {
            if (!active) return
            if (values) {
              setPreferences(values)
              setLoading(false)
              setError(null)
            } else if (!initialization) {
              initialization = settingsService.createDefaultUserPreferences(uid)
              void initialization.catch(fail)
            }
          },
          fail,
        )
      })
      .catch(fail)
    return () => {
      active = false
      currentSession.current = false
      unsubscribe?.()
    }
  }, [uid, attempt])

  function updatePreferences(input: UpdateUserPreferencesInput) {
    if (saveTask.current) return saveTask.current
    setSaving(true)
    const task = import('#settings-service')
      .then(({ settingsService }) => settingsService.updateUserPreferences(uid, input))
      .then((values) => {
        if (currentSession.current) {
          setPreferences(values)
          setError(null)
        }
        return values
      })
      .finally(() => {
        saveTask.current = null
        if (currentSession.current) setSaving(false)
      })
    saveTask.current = task
    return task
  }
  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        isLoading,
        error,
        isSaving,
        updatePreferences,
        retry: () => {
          setLoading(true)
          setError(null)
          setAttempt((value) => value + 1)
        },
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  )
}
