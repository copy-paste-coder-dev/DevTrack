import { getFirestore } from 'firebase/firestore'
import { getFirebaseApp } from './config.ts'
export const getFirebaseFirestore = () => getFirestore(getFirebaseApp())
