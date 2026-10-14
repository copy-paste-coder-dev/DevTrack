import { useId, useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Input } from '../../../components/ui/Input'
import { useRecentTasks } from '../hooks/useRecentTasks'
import { filterRecentTasks, type RecentTaskSuggestion } from '../domain/productivity'
import { activityMeta } from '../config/presentation'

export function RecentTaskInput({
  field,
  value,
  error,
  enabled,
  onChoose,
}: {
  field: UseFormRegisterReturn<'name'>
  value: string
  error?: string
  enabled: boolean
  onChoose: (suggestion: RecentTaskSuggestion) => void
}) {
  const { suggestions, isLoading, error: recentError } = useRecentTasks(enabled)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const id = useId()
  const matches = filterRecentTasks(suggestions, value)
  const expanded = open && enabled && matches.length > 0
  function choose(suggestion: RecentTaskSuggestion) {
    onChoose(suggestion)
    setOpen(false)
    setActive(-1)
  }
  return (
    <div className="recent-task-input">
      <Input
        label="Task / activity name"
        placeholder="What are you working on?"
        autoComplete="off"
        required
        error={error}
        {...field}
        data-autofocus
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? id : undefined}
        aria-activedescendant={
          expanded && active >= 0 && active < matches.length ? `${id}-${active}` : undefined
        }
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          void field.onBlur(event)
          setOpen(false)
          setActive(-1)
        }}
        onChange={(event) => {
          void field.onChange(event)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Escape' && expanded) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
            setActive(-1)
          }
          if (!matches.length || !enabled) return
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
            setActive((previous) =>
              event.key === 'ArrowDown'
                ? (previous + 1) % matches.length
                : previous <= 0
                  ? matches.length - 1
                  : previous - 1,
            )
          }
          if (
            event.key === 'Enter' &&
            !event.ctrlKey &&
            !event.metaKey &&
            expanded &&
            active >= 0 &&
            matches[active]
          ) {
            event.preventDefault()
            choose(matches[active])
          }
        }}
      />
      {expanded && (
        <div className="recent-task-panel">
          <span className="eyebrow">RECENT TASKS</span>
          <ul id={id} role="listbox" aria-label="Recent tasks">
            {matches.map((item, index) => (
              <li
                key={`${item.taskName}:${item.activityType}`}
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === active}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <span>{item.taskName}</span>
                <small>{activityMeta[item.activityType].label}</small>
              </li>
            ))}
          </ul>
          <p className="field-hint">↑ ↓ to choose · Enter to use · Esc to dismiss</p>
        </div>
      )}
      {open && enabled && isLoading && (
        <p className="field-hint" role="status">
          Loading recent tasks…
        </p>
      )}
      {open && enabled && recentError && (
        <p className="field-hint">Recent tasks unavailable. You can still log activity.</p>
      )}
    </div>
  )
}
