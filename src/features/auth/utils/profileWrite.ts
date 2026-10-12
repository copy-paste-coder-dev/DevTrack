import type { FieldValue } from 'firebase/firestore'
import type { AuthUser } from '../types/auth.types'
import type { ProfileCreate, ProfileUpdate } from '../types/profile.types'

export function buildProfileWrite(
  user: AuthUser,
  timestamp: FieldValue,
  exists: boolean,
): ProfileCreate | ProfileUpdate {
  const update: ProfileUpdate = {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    updatedAt: timestamp,
    lastLoginAt: timestamp,
  }
  return exists ? update : { ...update, uid: user.uid, provider: 'google', createdAt: timestamp }
}
