import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { eodAiService } from '#eod-ai-service'
import type { EodAiProviderId } from '../../../../functions/shared/eodAi'
import type { EodSummary } from '../types/eod.types'
import type { UserPreferences } from '../../settings/types/preferences'
import { buildAiEodInput } from '../domain/aiInput'
import { buildCompactEodText } from '../domain/eodText'
import { copySummary } from '../utils/clipboard'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'

const fallbackMessage = 'AI enhancement is unavailable. Your standard EOD summary is still ready.'
export function EodAiPanel({
  summary,
  preferences,
}: {
  summary: EodSummary
  preferences: UserPreferences
}) {
  const [providers, setProviders] = useState<EodAiProviderId[]>([])
  const [provider, setProvider] = useState<EodAiProviderId>('groq')
  const [checking, setChecking] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    let current = true
    eodAiService
      .getProviders()
      .then((available) => {
        if (current) {
          setProviders(available)
          setProvider(available[0] ?? 'groq')
          setChecking(false)
          setError(!available.length)
        }
      })
      .catch(() => {
        if (current) {
          setChecking(false)
          setError(true)
        }
      })
    return () => {
      current = false
      active.current = false
    }
  }, [revision])
  const standard = buildCompactEodText(summary, preferences)
  async function generate() {
    setGenerating(true)
    setError(false)
    setResult('')
    try {
      const response = await eodAiService.generate(provider, buildAiEodInput(summary))
      if (active.current) setResult(response.summary)
    } catch {
      if (active.current) setError(true)
    } finally {
      if (active.current) setGenerating(false)
    }
  }
  async function copy() {
    try {
      await copySummary(result || standard)
      toast.success('EOD summary copied.')
    } catch {
      toast.error('Unable to copy. Select the summary text and copy it manually.')
    }
  }
  return (
    <Card className="eod-panel eod-stack">
      <div>
        <h2>AI-enhanced wording</h2>
        <p>
          The factual data is generated locally from logged activities. AI chooses wording; task
          names, statuses and times stay intact.
        </p>
      </div>
      <p>
        Generating sends grouped task names, types, statuses, durations, session counts and gap
        totals to the selected provider. Notes and account details are excluded.
      </p>
      {checking ? (
        <p role="status">Connecting to AI… The first connection may take a minute.</p>
      ) : (
        providers.length > 0 && (
          <div className="eod-ai-controls">
            <label>
              AI Provider{' '}
              <select
                value={provider}
                disabled={generating}
                onChange={(event) => {
                  setProvider(event.target.value as EodAiProviderId)
                  setResult('')
                  setError(false)
                }}
              >
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {p === 'groq' ? 'Groq' : 'Gemini'}
                  </option>
                ))}
              </select>
            </label>
            <Button
              loading={generating}
              disabled={!summary.activitySessionCount}
              onClick={generate}
            >
              {generating ? 'Generating…' : result ? 'Regenerate' : 'Generate Better Summary'}
            </Button>
          </div>
        )
      )}
      {!summary.activitySessionCount && (
        <p>Log an activity before generating an enhanced summary.</p>
      )}
      {error && (
        <div role="status">
          <p>{fallbackMessage}</p>
          {!providers.length && (
            <Button
              variant="ghost"
              onClick={() => {
                setChecking(true)
                setRevision((r) => r + 1)
              }}
            >
              Check providers again
            </Button>
          )}
        </div>
      )}
      <h3>{result ? 'AI-enhanced wording' : 'Standard EOD summary'}</h3>
      <textarea
        className="eod-text"
        aria-label={result ? 'AI-enhanced summary' : 'Standard EOD summary'}
        value={result || standard}
        readOnly
        spellCheck={false}
      />
      <Button variant="secondary" onClick={copy}>
        Copy Summary
      </Button>
    </Card>
  )
}
