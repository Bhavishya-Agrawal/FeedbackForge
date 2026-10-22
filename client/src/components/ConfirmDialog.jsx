import { useEffect, useId, useRef } from 'react'

// Native <dialog>: the browser traps focus and closes on Escape. Cancel is focused first so Enter never deletes by accident.
export default function ConfirmDialog({ open, title, children, confirmLabel = 'Delete', busy = false, onConfirm, onCancel }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <div className="dialog-body">
        <h2 id={titleId}>{title}</h2>
        <div>{children}</div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy} autoFocus>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
