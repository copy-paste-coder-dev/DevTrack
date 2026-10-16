import {
  availableProviders,
  GroqEodProvider,
  GeminiEodProvider,
  type EodAiProvider,
} from './eodAi.js'
import type { EodAiProviderId } from '../shared/eodAi.js'

export function renderConfiguration(env: NodeJS.ProcessEnv) {
  const projectId = env.FIREBASE_PROJECT_ID?.trim()
  if (!projectId || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId))
    throw new Error('Set FIREBASE_PROJECT_ID to the intended Firebase project.')
  if (env.FIREBASE_AUTH_EMULATOR_HOST)
    throw new Error(
      'The HTTP backend requires real Firebase tokens; unset FIREBASE_AUTH_EMULATOR_HOST.',
    )
  const origins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (!origins.length) throw new Error('Set ALLOWED_ORIGINS to exact frontend origins.')
  for (const origin of origins) {
    const url = new URL(origin)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (
      url.origin !== origin ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && local && env.NODE_ENV !== 'production'))
    )
      throw new Error(
        'ALLOWED_ORIGINS must contain exact HTTPS origins (HTTP loopback is local only).',
      )
  }
  let keys: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(env.EOD_AI_KEYS ?? '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    keys = parsed as Record<string, unknown>
  } catch {
    throw new Error('EOD_AI_KEYS must be a JSON object with groq and/or gemini keys.')
  }
  const config = {
    enabled: env.EOD_AI_PROVIDERS ?? '',
    groqKey: typeof keys.groq === 'string' ? keys.groq.trim() : '',
    geminiKey: typeof keys.gemini === 'string' ? keys.gemini.trim() : '',
    groqModel: env.GROQ_MODEL?.trim() ?? '',
    geminiModel: env.GEMINI_MODEL?.trim() ?? '',
  }
  const enabled = config.enabled
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const available = availableProviders(config)
  if (enabled.some((provider) => !available.includes(provider as EodAiProviderId)))
    throw new Error('Each enabled provider requires a supported provider name, API key and model.')
  const providers: Partial<Record<EodAiProviderId, EodAiProvider>> = {}
  if (available.includes('groq'))
    providers.groq = new GroqEodProvider(config.groqKey, config.groqModel)
  if (available.includes('gemini'))
    providers.gemini = new GeminiEodProvider(config.geminiKey, config.geminiModel)
  const port = Number(env.PORT ?? '10000')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.')
  return { projectId, origins, providers, port }
}
