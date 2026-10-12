import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

interface ConfirmationDialogProps {
  title: string
  children: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}
export function ConfirmationDialog({
  title,
  children,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmationDialogProps) {
  return (
    <Dialog title={title} onClose={onCancel} busy={busy}>
      <div className="delete-confirmation">
        {children}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
