import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore'
import { getFirebaseFirestore } from '../../../firebase/firestore'
import type { ActivityService } from '../types/activity'
import {
  mapActivityDocument,
  mapActivityToCreatePayload,
  mapActivityToUpdatePayload,
} from '../utils/activity.mapper'
import { sortActivities } from '../utils/activitySummary'
import { isDateKey } from '../../../utils/date'

function validSegment(value: string) {
  if (!value || value.includes('/')) throw new Error('A valid user or activity ID is required.')
  return value
}
function activitiesCollection(uid: string) {
  return collection(getFirebaseFirestore(), 'users', validSegment(uid), 'activities')
}
function dayQuery(uid: string, dateKey: string) {
  if (!isDateKey(dateKey)) throw new Error('A valid date is required.')
  return query(
    activitiesCollection(uid),
    where('dateKey', '==', dateKey),
    orderBy('startAt', 'asc'),
  )
}
function rangeQuery(uid: string, start: string, end: string) {
  if (!isDateKey(start) || !isDateKey(end) || end < start)
    throw new Error('A valid date range is required.')
  return query(
    activitiesCollection(uid),
    where('dateKey', '>=', start),
    where('dateKey', '<=', end),
    orderBy('dateKey', 'asc'),
  )
}
function mapSnapshot(snapshot: QuerySnapshot) {
  return sortActivities(snapshot.docs.map((item) => mapActivityDocument(item.id, item.data())))
}
function subscribe(
  target: Query,
  next: Parameters<ActivityService['subscribeToActivitiesByDate']>[2],
  error: (cause: unknown) => void,
) {
  return onSnapshot(
    target,
    (snapshot) => {
      try {
        next(mapSnapshot(snapshot))
      } catch (cause) {
        error(cause)
      }
    },
    error,
  )
}
function requireOnline() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw { code: 'app/offline' }
}
export const activityService: ActivityService = {
  async createActivity(uid, input) {
    requireOnline()
    const payload = mapActivityToCreatePayload(input)
    const target = doc(activitiesCollection(uid))
    await setDoc(target, payload)
    return target.id
  },
  async updateActivity(uid, id, input) {
    requireOnline()
    await updateDoc(
      doc(activitiesCollection(uid), validSegment(id)),
      mapActivityToUpdatePayload(input),
    )
  },
  async deleteActivity(uid, id) {
    requireOnline()
    await deleteDoc(doc(activitiesCollection(uid), validSegment(id)))
  },
  async getActivitiesByDate(uid, dateKey) {
    return mapSnapshot(await getDocs(dayQuery(uid, dateKey)))
  },
  async getActivitiesByDateRange(uid, start, end) {
    return mapSnapshot(await getDocs(rangeQuery(uid, start, end)))
  },
  subscribeToActivitiesByDate(uid, dateKey, next, error) {
    return subscribe(dayQuery(uid, dateKey), next, error)
  },
  subscribeToActivitiesByRange(uid, start, end, next, error) {
    return subscribe(rangeQuery(uid, start, end), next, error)
  },
}
