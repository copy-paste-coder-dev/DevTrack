import type { AiEodInput, EodAiProviderId } from '../../functions/shared/eodAi'
export const eodAiService = {
  async getProviders(): Promise<EodAiProviderId[]> {
    if (localStorage.getItem('devtrack-e2e-ai') === 'unavailable') throw new Error('Unavailable')
    return ['groq', 'gemini']
  },
  async generate(provider: EodAiProviderId, input: AiEodInput) {
    sessionStorage.setItem('devtrack-e2e-ai-input', JSON.stringify({ provider, input }))
    if (localStorage.getItem('devtrack-e2e-ai') === 'failure') throw new Error('Provider failed')
    return {
      summary: `EOD Summary — ${input.date}\nLogged: ${input.totalLogged} / ${input.target}\n${input.tasks.map((t) => `${t.taskName} — ${t.totalDuration} · ${t.status}`).join('\n')}`,
    }
  },
}
