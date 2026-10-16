import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import {
  availableProviders,
  EodAiError,
  generateEodForRequest,
  GroqEodProvider,
  GeminiEodProvider,
} from './eodAi.js'

// One JSON secret allows either provider to be omitted without requiring an unused secret at deploy time.
const keys = defineSecret('EOD_AI_KEYS')
const enabled = defineString('EOD_AI_PROVIDERS', { default: '' })
const groqModel = defineString('GROQ_MODEL', { default: '' })
const geminiModel = defineString('GEMINI_MODEL', { default: '' })
function configuration() {
  let secrets: { groq?: string; gemini?: string } = {}
  try {
    secrets = JSON.parse(keys.value())
  } catch {
    /* Invalid/missing config disables enhancement. */
  }
  return {
    enabled: enabled.value(),
    groqKey: typeof secrets?.groq === 'string' ? secrets.groq : '',
    groqModel: groqModel.value(),
    geminiKey: typeof secrets?.gemini === 'string' ? secrets.gemini : '',
    geminiModel: geminiModel.value(),
  }
}
const options = {
  region: 'us-central1',
  secrets: [keys],
  timeoutSeconds: 30,
  maxInstances: 2,
  memory: '256MiB' as const,
}
export const getEodAiProviders = onCall(options, (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to use EOD enhancement.')
  return { providers: availableProviders(configuration()) }
})
// Per-instance cooldown is supplemental to auth, bounded input, max instances and a 20s provider deadline.
const cooldowns = new Map<string, number>()
function claim(uid: string) {
  const now = Date.now()
  for (const [key, expires] of cooldowns) if (expires <= now) cooldowns.delete(key)
  if (cooldowns.has(uid) || cooldowns.size >= 10000) return false
  cooldowns.set(uid, now + 30000)
  return true
}
export const generateEodSummary = onCall(options, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to use EOD enhancement.')
  const config = configuration()
  const providers = availableProviders(config)
  try {
    return await generateEodForRequest(
      { uid: request.auth.uid, data: request.data },
      {
        claim,
        providers: {
          ...(providers.includes('groq')
            ? { groq: new GroqEodProvider(config.groqKey, config.groqModel) }
            : {}),
          ...(providers.includes('gemini')
            ? { gemini: new GeminiEodProvider(config.geminiKey, config.geminiModel) }
            : {}),
        },
      },
    )
  } catch (error) {
    throw new HttpsError(
      error instanceof EodAiError ? error.code : 'unavailable',
      'AI enhancement is unavailable. Your standard EOD summary is still ready.',
    )
  }
})
