import { useRef, useState } from 'react'
import { activityService } from '#activity-service'
import { useAuth } from '../../auth/hooks/useAuth'
import type { CreateActivityInput, UpdateActivityInput } from '../types/activity'

type Operation = 'create' | 'update' | 'delete'
export function useActivityMutations() {
  const { user } = useAuth()
  const [operation, setOperation] = useState<Operation | null>(null)
  const pending = useRef<Promise<unknown> | null>(null)
  async function run<T>(action: Operation, mutate: (uid: string) => Promise<T>): Promise<T> {
    if (!user) throw { code: 'unauthenticated' }
    if (pending.current) throw { code: 'app/mutation-in-progress' }
    setOperation(action)
    const promise = Promise.resolve().then(() => mutate(user.uid))
    pending.current = promise
    try {
      return await promise
    } finally {
      pending.current = null
      setOperation(null)
    }
  }
  return {
    createActivity: (input: CreateActivityInput) =>
      run('create', (uid) => activityService.createActivity(uid, input)),
    updateActivity: (id: string, input: UpdateActivityInput) =>
      run('update', (uid) => activityService.updateActivity(uid, id, input)),
    deleteActivity: (id: string) => run('delete', (uid) => activityService.deleteActivity(uid, id)),
    isCreating: operation === 'create',
    isUpdating: operation === 'update',
    isDeleting: operation === 'delete',
  }
}
