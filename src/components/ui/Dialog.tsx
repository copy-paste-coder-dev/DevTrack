import { useEffect, useId, useRef, type PropsWithChildren } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface DialogProps extends PropsWithChildren {
  title: string
  eyebrow?: string
  onClose: () => void
  busy?: boolean
}
export function Dialog({ title, eyebrow, onClose, children, busy = false }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const previousFocus = document.activeElement
    const element = dialog.current
    element?.showModal()
    element?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      element?.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="activity-dialog"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== 'Tab' || event.defaultPrevented) return
        const element = event.currentTarget
        const focusable = [
          ...element.querySelectorAll<HTMLElement>(
            'button, input:not([type="hidden"]), select, textarea, a[href], [tabindex]',
          ),
        ].filter(
          (item) => !item.matches(':disabled, [tabindex="-1"]') && item.getClientRects().length > 0,
        )
        const first = focusable[0]
        const last = focusable.at(-1)
        if (!first) {
          event.preventDefault()
          element.focus()
          return
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === element)
        ) {
          event.preventDefault()
          last?.focus()
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === element)
        ) {
          event.preventDefault()
          first.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.target === event.currentTarget &&
          (event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom)
        )
          if (!busy) onClose()
      }}
    >
      <div className="dialog-header">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id={titleId}>{title}</h2>
        </div>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </Button>
      </div>
      {children}
    </dialog>
  )
}
