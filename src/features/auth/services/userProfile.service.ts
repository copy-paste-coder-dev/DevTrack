import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { getFirebaseFirestore } from '../../../firebase/firestore'
import type { AuthUser } from '../types/auth.types'
import { buildProfileWrite } from '../utils/profileWrite'

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
