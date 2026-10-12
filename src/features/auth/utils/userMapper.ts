import type { User } from 'firebase/auth'
import type { AuthUser } from '../types/auth.types'

export function mapFirebaseUser(
  user: Pick<User, 'uid' | 'displayName' | 'email' | 'photoURL'>,
): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  }
}

export function getUserDisplayName(name: string | null) {
  return name?.trim() || 'Developer'
}

export function getUserInitials(name: string | null, email: string | null) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length)
    return `${words[0]?.[0] ?? ''}${words.length > 1 ? (words.at(-1)?.[0] ?? '') : ''}`.toUpperCase()
  return email?.trim()[0]?.toUpperCase() || 'U'
}
