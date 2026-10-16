import { getFirebaseAuth } from '../../../firebase/auth'
import { createEodAiTransport } from './eodAi.transport'

export const eodAiService = createEodAiTransport({
  baseUrl: import.meta.env.VITE_EOD_AI_BASE_URL ?? '',
  allowLocalHttp: import.meta.env.DEV,
  getToken: async () => {
    const user = getFirebaseAuth().currentUser
    if (!user) throw new Error('Sign in to use EOD enhancement')
    return user.getIdToken()
  },
})
