import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { addDays } from 'date-fns'
import { useAuth } from '../../auth/hooks/useAuth'
import { toDateKey } from '../../../utils/date'
import type { Activity } from '../../activities/types/activity'
import type { ActivityGap } from '../../activities/domain/activityTime'
import type { DialogSelection } from '../../activities/components/ActivityDialog'
import { getActivityShortcut } from '../utils/keyboard'

export function useActivityWorkflow({
  selected,
  selectDay,
  activities,
  disabled,
}: {
  selected: Date
  selectDay: (date: Date) => void
  activities: readonly Activity[]
  disabled: boolean
}) {
  const { user } = useAuth()
  const dateCursorRef = useRef(selected)
  useLayoutEffect(() => {
    dateCursorRef.current = selected
  }, [selected])
  const key = `${user?.uid}:${toDateKey(selected)}`
  const [state, setState] = useState<{
    key: string
    dialog: DialogSelection | null
    help: boolean
  }>({ key, dialog: null, help: false })
  // Discard a draft if navigation/account state changes outside this workflow.
  if (state.key !== key) setState({ key, dialog: null, help: false })
  const current = state.key === key ? state : { key, dialog: null, help: false }
  const open = (dialog: DialogSelection) => {
    if (!disabled && !current.dialog && !current.help) setState({ key, dialog, help: false })
  }
  const close = () => setState({ key, dialog: null, help: false })
  const latest = activities.length
    ? activities.reduce((last, item) => (item.endAt > last.endAt ? item : last))
    : null
  useEffect(() => {
    // Router URL changes may precede the next React commit. Preserve rapid key
    // navigation relative to the last requested date until the effect refreshes.
    function onKeyDown(event: KeyboardEvent) {
      const overlayOpen = Boolean(
        current.dialog || current.help || document.querySelector('dialog[open], [role="menu"]'),
      )
      // Keep browser history shortcuts from discarding an open draft/menu.
      if (
        overlayOpen &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        ['ArrowLeft', 'ArrowRight'].includes(event.key)
      ) {
        event.preventDefault()
        return
      }
      const action = getActivityShortcut(event, overlayOpen)
      if (!action || (action === 'new' && disabled)) return
      event.preventDefault()
      if (action === 'new') {
        document.querySelector<HTMLElement>('[data-add-activity]')?.focus()
        setState({ key, dialog: { activity: null }, help: false })
      }
      if (action === 'today') {
        dateCursorRef.current = new Date()
        selectDay(dateCursorRef.current)
      }
      if (action === 'previous') {
        dateCursorRef.current = addDays(dateCursorRef.current, -1)
        selectDay(dateCursorRef.current)
      }
      if (action === 'next') {
        dateCursorRef.current = addDays(dateCursorRef.current, 1)
        selectDay(dateCursorRef.current)
      }
      if (action === 'help') setState({ key, dialog: null, help: true })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [current.dialog, current.help, disabled, key, selected, selectDay])
  return {
    dialog: current.dialog,
    helpOpen: current.help,
    close,
    showHelp: () => setState({ key, dialog: null, help: true }),
    add: () => open({ activity: null }),
    logGap: (gap: ActivityGap) => open({ activity: null, gap }),
    edit: (activity: Activity) => open({ activity }),
    remove: (activity: Activity) => open({ activity, action: 'delete' }),
    duplicate: (original: Activity) => open({ activity: null, original, source: 'duplicate' }),
    repeatLast: () => {
      if (latest) open({ activity: null, original: latest, source: 'repeat_last' })
    },
    canRepeat: Boolean(latest) && !disabled,
  }
}
