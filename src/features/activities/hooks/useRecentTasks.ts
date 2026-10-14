import { useEffect, useMemo, useState } from 'react'
import { activityService } from '#activity-service'
import { useAuth } from '../../auth/hooks/useAuth'
import { useUserPreferences } from '../../settings/hooks/useUserPreferences'
import type { Activity } from '../types/activity'
import { buildRecentTasks } from '../domain/productivity'

// One bounded read per create-dialog opening. A late account/dialog result is discarded.
export function useRecentTasks(enabled: boolean) {
  const { user } = useAuth()
  const uid = user?.uid
  const { preferences } = useUserPreferences()
  const [state, setState] = useState<{
    uid: string
    activities: Activity[]
    error: boolean
  } | null>(null)
  useEffect(() => {
    if (!uid || !enabled) return
    let active = true
    void activityService.getRecentActivities(uid).then(
      (activities) => {
        if (active) setState({ uid, activities, error: false })
      },
      () => {
        if (active) setState({ uid, activities: [], error: true })
      },
    )
    return () => {
      active = false
    }
  }, [uid, enabled])
  const current = enabled && state?.uid === uid ? state : null
  const suggestions = useMemo(
    () => buildRecentTasks(current?.activities ?? [], preferences.enabledActivityTypes),
    [current, preferences.enabledActivityTypes],
  )
  return {
    suggestions,
    isLoading: enabled && Boolean(uid) && !current,
    error: current?.error ?? false,
  }
}
