import { useEffect, useState } from 'react'
import { activityService } from '#activity-service'
import { useAuth } from '../../auth/hooks/useAuth'
import type { Activity } from '../types/activity'
import { getActivityErrorMessage } from '../utils/activityError'

export function useActivities(start: string, end?: string) {
  const { user } = useAuth()
  const uid = user?.uid
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([uid, start, end, revision])
  const [state, setState] = useState<{ key: string; activities: Activity[]; error: string | null }>(
    { key: '', activities: [], error: null },
  )
  useEffect(() => {
    if (!uid) return
    let active = true
    const next = (activities: Activity[]) => {
      if (active) setState({ key, activities, error: null })
    }
    const fail = (cause: unknown) => {
      if (import.meta.env.DEV) {
        const code =
          cause && typeof cause === 'object' && 'code' in cause
            ? String(cause.code)
            : 'invalid-data'
        console.info('Activity query failed:', code)
      }
      if (active) setState({ key, activities: [], error: getActivityErrorMessage(cause, 'read') })
    }
    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe =
        end === undefined
          ? activityService.subscribeToActivitiesByDate(uid, start, next, fail)
          : activityService.subscribeToActivitiesByRange(uid, start, end, next, fail)
    } catch (cause) {
      fail(cause)
    }
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [uid, start, end, key])
  const current = state.key === key
  return {
    activities: uid && current ? state.activities : [],
    isLoading: Boolean(uid) && !current,
    error: uid && current ? state.error : null,
    retry: () => setRevision((value) => value + 1),
  }
}
