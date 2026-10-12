import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { getFirebaseFirestore } from '../../../firebase/firestore'
import type { AuthUser } from '../types/auth.types'
import type { UserProfile } from '../types/profile.types'
import { buildProfileWrite } from '../utils/profileWrite'

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(getFirebaseFirestore(), 'users', uid))
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null
}

export async function syncUserProfile(user: AuthUser): Promise<void> {
  const database = getFirebaseFirestore()
  const reference = doc(database, 'users', user.uid)
  // A transaction also preserves createdAt when two first logins race across tabs.
  await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(reference)
    transaction.set(reference, buildProfileWrite(user, serverTimestamp(), snapshot.exists()), {
      merge: true,
    })
  })
}
