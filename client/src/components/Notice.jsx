export default function Notice({ kind = 'info', title, children, onDismiss }) {
  const isError = kind === 'error'
  return (
    <div className={`notice ${isError ? 'notice-error' : ''}`} role={isError ? 'alert' : 'status'}>
      <div className="row-between">
        <p>
          {title && <strong>{title} </strong>}
          {children}
        </p>
        {onDismiss && (
          <button type="button" className="btn btn-small" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
