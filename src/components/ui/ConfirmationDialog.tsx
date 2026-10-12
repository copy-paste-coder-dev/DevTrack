import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

interface ConfirmationDialogProps {
  title: string
  children: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}
export function ConfirmationDialog({
  title,
  children,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <div className="delete-confirmation">
        {children}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
