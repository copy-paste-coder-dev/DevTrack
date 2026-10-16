import type { AiEodInput, AiEodOutput, EodAiProviderId } from '../../../../functions/shared/eodAi'

export function createEodAiTransport(options: {
  baseUrl: string
  getToken: () => Promise<string>
  request?: typeof fetch
  timeoutMs?: number
  allowLocalHttp?: boolean
}) {
  async function call(path: string, data?: unknown): Promise<unknown> {
    if (!options.baseUrl) throw new Error('AI backend is not configured')
    const base = new URL(options.baseUrl)
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
    if (
      (base.protocol !== 'https:' &&
        !(base.protocol === 'http:' && loopback && options.allowLocalHttp)) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      base.pathname !== '/'
    )
      throw new Error('Invalid AI backend URL')
    const token = await options.getToken()
    if (!token) throw new Error('Sign in to use EOD enhancement')
    const response = await (options.request ?? fetch)(new URL(path, base), {
      method: data === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 120000),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('AI enhancement is unavailable')
    return response.json() as Promise<unknown>
  }
  return {
    async getProviders(): Promise<EodAiProviderId[]> {
      const result = await call('/providers')
      if (
        !result ||
        typeof result !== 'object' ||
        !('providers' in result) ||
        !Array.isArray(result.providers) ||
        result.providers.some((p: unknown) => p !== 'groq' && p !== 'gemini')
      )
        throw new Error('Invalid providers')
      return [...new Set(result.providers)] as EodAiProviderId[]
    },
    async generate(provider: EodAiProviderId, input: AiEodInput): Promise<AiEodOutput> {
      const result = await call('/summary', { provider, input })
      if (
        !result ||
        typeof result !== 'object' ||
        !('summary' in result) ||
        typeof result.summary !== 'string' ||
        !result.summary.trim() ||
        result.summary.length > 64000
      )
        throw new Error('Invalid summary')
      return { summary: result.summary }
    },
  }
}
