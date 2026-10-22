import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { submissionsApi } from '../api/index.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import CopyLink from '../components/CopyLink.jsx'
import Notice from '../components/Notice.jsx'
import { formatDateTime, preview } from '../utils/format.js'

export default function Inbox() {
  const { submissions, total, loading, reload, publicUrl, productId } = useOutletContext()
  const [pending, setPending] = useState(null) // { kind: 'one', item } | { kind: 'all' }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirmDelete() {
    setBusy(true)
    setError('')
    try {
      if (pending.kind === 'one') await submissionsApi.remove(productId, pending.item.id)
      else await submissionsApi.clear(productId)
      setPending(null)
      await reload()
    } catch (err) {
      setPending(null)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="inbox-heading">
      <div className="row-between">
        <div>
          <h2 id="inbox-heading">Inbox</h2>
          <p className="small">{total === 1 ? '1 pending submission, newest first.' : `${total} pending submissions, newest first.`}</p>
        </div>
        <button type="button" className="btn" onClick={() => setPending({ kind: 'all' })} disabled={total === 0}>
          Clear all
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12 }}>
          <Notice kind="error" title="Could not delete." onDismiss={() => setError('')}>
            {error}
          </Notice>
        </div>
      )}

      {loading ? (
        <p className="note" style={{ marginTop: 16 }}>Loading feedback…</p>
      ) : submissions.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          <h3>Your inbox is clear.</h3>
          <p>New feedback appears here as soon as someone submits it through your public link.</p>
          <CopyLink url={publicUrl} id="inbox-link" />
        </div>
      ) : (
        <>
          <ul className="item-list">
            {submissions.map((s) => (
              <li key={s.id} className="item">
                <div className="item-main">
                  <h3>{s.title}</h3>
                  <p className="small note">{formatDateTime(s.createdAt)}</p>
                  <p style={{ marginTop: 6 }}>{preview(s.description, 220)}</p>
                  {s.description.length > 220 && (
                    <details className="more">
                      <summary>Show full text</summary>
                      <p style={{ marginTop: 6 }}>{s.description}</p>
                    </details>
                  )}
                </div>
                <div>
                  <button type="button" className="btn btn-small" onClick={() => setPending({ kind: 'one', item: s })} aria-label={`Delete submission: ${s.title}`}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {total > submissions.length && (
            <p className="small note" style={{ marginTop: 12 }}>
              Showing the newest {submissions.length} of {total}. Compile processes the oldest first.
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'all' ? 'Delete all pending feedback?' : 'Delete this submission?'}
        confirmLabel={pending?.kind === 'all' ? 'Delete all' : 'Delete'}
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === 'all' ? (
          <p>All {total} pending submissions will be permanently deleted. This cannot be undone.</p>
        ) : (
          <p>“{pending?.item.title}” will be permanently deleted. This cannot be undone.</p>
        )}
      </ConfirmDialog>
    </section>
  )
}
