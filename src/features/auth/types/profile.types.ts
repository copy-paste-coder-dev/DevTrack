import type { FieldValue, Timestamp } from 'firebase/firestore'
import type { AuthUser } from './auth.types'

export interface UserProfile extends AuthUser {
  provider: 'google'
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt: Timestamp
}

export type ProfileUpdate = Pick<AuthUser, 'displayName' | 'email' | 'photoURL'> & {
  updatedAt: FieldValue
  lastLoginAt: FieldValue
}

export type ProfileCreate = ProfileUpdate & {
  uid: string
  provider: 'google'
  createdAt: FieldValue
}
