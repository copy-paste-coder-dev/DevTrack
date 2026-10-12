import { getFirestore } from 'firebase/firestore'
import { getFirebaseApp } from './config'
export const getFirebaseFirestore = () => getFirestore(getFirebaseApp())
