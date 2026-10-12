import { useEffect, useId, useRef, type PropsWithChildren } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface DialogProps extends PropsWithChildren {
  title: string
  eyebrow?: string
  onClose: () => void
}
export function Dialog({ title, eyebrow, onClose, children }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const previousFocus = document.activeElement
    const element = dialog.current
    element?.showModal()
    return () => {
      element?.close()
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="activity-dialog"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
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
          onClose()
      }}
    >
      <div className="dialog-header">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id={titleId}>{title}</h2>
        </div>
        <Button variant="ghost" className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      {children}
    </dialog>
  )
}
