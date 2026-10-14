import type { FieldValue } from 'firebase/firestore'
import type { AuthUser } from './auth.types'

export type ProfileUpdate = Pick<AuthUser, 'displayName' | 'email' | 'photoURL'> & {
  updatedAt: FieldValue
  lastLoginAt: FieldValue
}

export type ProfileCreate = ProfileUpdate & {
  uid: string
  provider: 'google'
  createdAt: FieldValue
}
