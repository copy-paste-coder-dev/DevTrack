import { useId, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Copy } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import type { EodSummary } from '../types/eod.types'
import type { UserPreferences } from '../../settings/types/preferences'
import { buildCompactEodText, buildDetailedEodText } from '../domain/eodText'
import { copySummary } from '../utils/clipboard'
import { EodAiPanel } from './EodAiPanel'
import { buildAiEodInput } from '../domain/aiInput'

export function EodOutput({
  summary,
  preferences,
  children,
}: {
  summary: EodSummary
  preferences: UserPreferences
  children: ReactNode
}) {
  const [tab, setTab] = useState('Visual')
  const id = useId()
  const tabs = ['Visual', 'Compact Text', 'Detailed Text', 'AI Enhanced']
  const text =
    tab === 'Detailed Text'
      ? buildDetailedEodText(summary, preferences)
      : buildCompactEodText(summary, preferences)
  return (
    <div className="eod-stack">
      <div className="eod-output-tools">
        <div role="tablist" aria-label="Summary format" className="eod-tabs">
          {tabs.map((name, index) => (
            <button
              key={name}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-controls={`${id}-panel-${index}`}
              aria-selected={tab === name}
              tabIndex={tab === name ? 0 : -1}
              onClick={() => setTab(name)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? tabs.length - 1
                      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
                setTab(tabs[next]!)
                document.getElementById(`${id}-tab-${next}`)?.focus()
              }}
            >
              {name}
            </button>
          ))}
        </div>
        {tab !== 'AI Enhanced' && (
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await copySummary(text)
                toast.success('EOD summary copied.')
              } catch {
                toast.error('Unable to copy. Select the summary text and copy it manually.')
              }
            }}
          >
            <Copy size={16} />
            Copy for Teams / Slack
          </Button>
        )}
      </div>
      {tabs.map((name, index) => (
        <div
          key={name}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={tab !== name}
          tabIndex={0}
        >
          {tab === name &&
            (name === 'Visual' ? (
              children
            ) : name === 'AI Enhanced' ? (
              <EodAiPanel
                key={JSON.stringify(buildAiEodInput(summary))}
                summary={summary}
                preferences={preferences}
              />
            ) : (
              <textarea
                className="eod-text"
                aria-label={name}
                readOnly
                value={text}
                spellCheck={false}
              />
            ))}
        </div>
      ))}
    </div>
  )
}
