import {
  doc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { getFirebaseFirestore } from '../../../firebase/firestore.ts'
import { getDefaultUserPreferences } from '../config/defaultPreferences.ts'
import type { SettingsService } from '../types/preferences.ts'
import { mapUserPreferences } from '../utils/preferences.mapper.ts'
import { userPreferencesSchema } from '../validation/preferences.schema.ts'

function preferencesRef(uid: string) {
  if (!uid || uid.includes('/')) throw new Error('A valid user ID is required.')
  return doc(getFirebaseFirestore(), 'users', uid, 'settings', 'preferences')
}
function requireOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw { code: 'app/offline' }
}
export const settingsService: SettingsService = {
  async getUserPreferences(uid) {
    const snapshot = await getDocFromServer(preferencesRef(uid))
    return snapshot.exists() ? mapUserPreferences(snapshot.data()) : null
  },
  async createDefaultUserPreferences(uid) {
    requireOnline()
    const target = preferencesRef(uid)
    await runTransaction(getFirebaseFirestore(), async (transaction) => {
      const snapshot = await transaction.get(target)
      // A concurrent tab's existing values win. Defaults never overwrite an existing document.
      if (!snapshot.exists())
        transaction.set(target, {
          ...getDefaultUserPreferences(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
    })
  },
  async updateUserPreferences(uid, input) {
    requireOnline()
    const preferences = userPreferencesSchema.parse(input)
    const target = preferencesRef(uid)
    await runTransaction(getFirebaseFirestore(), async (transaction) => {
      const snapshot = await transaction.get(target)
      transaction.set(target, {
        ...preferences,
        createdAt: snapshot.data()?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
    return preferences
  },
  subscribeToUserPreferences(uid, next, error) {
    return onSnapshot(
      preferencesRef(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        // Do not initialize defaults from an unconfirmed cache miss.
        if (!snapshot.exists() && snapshot.metadata.fromCache) return
        try {
          next(snapshot.exists() ? mapUserPreferences(snapshot.data()) : null)
        } catch (cause) {
          error(cause)
        }
      },
      error,
    )
  },
}
