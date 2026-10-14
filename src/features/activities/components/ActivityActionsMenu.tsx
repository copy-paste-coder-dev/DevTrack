import { useEffect, useId, useRef, useState } from 'react'
import { Copy, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import type { Activity } from '../types/activity'

export function ActivityActionsMenu({
  activity,
  onDuplicate,
  onDelete,
}: {
  activity: Activity
  onDuplicate: (activity: Activity) => void
  onDelete: (activity: Activity) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }
  return (
    <div className="activity-menu" ref={rootRef}>
      <Button
        variant="ghost"
        className="icon-button"
        ref={triggerRef}
        aria-label={`More actions for ${activity.taskName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <MoreHorizontal size={17} />
      </Button>
      {open && (
        <div
          className="activity-menu-panel"
          ref={menuRef}
          id={id}
          role="menu"
          aria-label={`Actions for ${activity.taskName}`}
          onKeyDown={(event) => {
            const items = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
            ]
            const index = items.findIndex((item) => item === document.activeElement)
            let next: number | undefined
            if (event.key === 'ArrowDown') next = (index + 1) % items.length
            if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
            if (event.key === 'Home') next = 0
            if (event.key === 'End') next = items.length - 1
            if (next !== undefined) {
              event.preventDefault()
              items[next]?.focus()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              close()
            }
            if (event.key === 'Tab') close()
          }}
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              close()
              onDuplicate(activity)
            }}
          >
            <Copy size={15} />
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="danger-hover"
            onClick={() => {
              close()
              onDelete(activity)
            }}
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
