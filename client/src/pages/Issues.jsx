import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { issuesApi } from '../api/index.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Notice from '../components/Notice.jsx'
import StatusLabel from '../components/StatusLabel.jsx'
import { STATUSES, statusLabel } from '../utils/constants.js'
import { plural, preview } from '../utils/format.js'

function IssueCard({ issue, busy, onStatus, onDelete }) {
  return (
    <li className="card">
      <h3>{issue.title}</h3>
      <p>{preview(issue.description, 140)}</p>
      {issue.description.length > 140 && (
        <details className="more">
          <summary>Show full description</summary>
          <p>{issue.description}</p>
        </details>
      )}
      <div className="card-foot">
        <span className="report-count">{plural(issue.reportCount, 'report', 'reports')}</span>
        <StatusLabel status={issue.status} />
      </div>
      <div className="card-controls">
        <label htmlFor={`status-${issue.id}`}>Move to</label>
        <select id={`status-${issue.id}`} value={issue.status} disabled={busy} onChange={(e) => onStatus(issue, e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-small" onClick={() => onDelete(issue)} disabled={busy} aria-label={`Delete issue: ${issue.title}`}>
          Delete
        </button>
      </div>
    </li>
  )
}

export default function Issues() {
  const { issues, loading, reload, productId } = useOutletContext()
  const [busyId, setBusyId] = useState(null)
  const [pending, setPending] = useState(null) // { kind: 'one', issue } | { kind: 'column', status, count }
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function changeStatus(issue, status) {
    if (status === issue.status) return
    setBusyId(issue.id)
    setError('')
    try {
      await issuesApi.setStatus(productId, issue.id, status)
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    setError('')
    try {
      if (pending.kind === 'one') await issuesApi.remove(productId, pending.issue.id)
      else await issuesApi.removeByStatus(productId, pending.status)
      setPending(null)
      await reload()
    } catch (err) {
      setPending(null)
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section aria-labelledby="issues-heading">
      <h2 id="issues-heading">Issues</h2>

      {error && (
        <div style={{ marginTop: 12 }}>
          <Notice kind="error" onDismiss={() => setError('')}>
            {error}
          </Notice>
        </div>
      )}

      {loading ? (
        <p className="note" style={{ marginTop: 16 }}>Loading issues…</p>
      ) : issues.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          <h3>No issues yet.</h3>
          <p>Compiled issues appear here after feedback has been collected and compiled.</p>
        </div>
      ) : (
        <div className="board-scroll" style={{ marginTop: 16 }}>
          <div className="board">
            {STATUSES.map((status) => {
              const column = issues.filter((i) => i.status === status.value)
              return (
                <section key={status.value} className="column" data-status={status.value} aria-label={status.label}>
                  <div className="column-head">
                    <div className="column-title">
                      <h3>{status.label}</h3>
                      <span className="column-count">{column.length}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-small"
                      disabled={column.length === 0}
                      onClick={() => setPending({ kind: 'column', status: status.value, count: column.length })}
                    >
                      Delete all in column
                    </button>
                  </div>
                  <div className="column-body">
                    {column.length === 0 ? (
                      <p className="small note">No issues here.</p>
                    ) : (
                      <ul className="stack" style={{ listStyle: 'none' }}>
                        {column.map((issue) => (
                          <IssueCard key={issue.id} issue={issue} busy={busyId === issue.id} onStatus={changeStatus} onDelete={(i) => setPending({ kind: 'one', issue: i })} />
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'column' ? `Delete all ${statusLabel(pending.status)} issues?` : 'Delete this issue?'}
        confirmLabel={pending?.kind === 'column' ? 'Delete all' : 'Delete'}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === 'column' ? (
          <p>
            {plural(pending.count, 'issue', 'issues')} in {statusLabel(pending.status)} will be permanently deleted. This cannot be undone.
          </p>
        ) : (
          <p>“{pending?.issue.title}” will be permanently deleted, including its report count. This cannot be undone.</p>
        )}
      </ConfirmDialog>
    </section>
  )
}
