import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicApi } from '../api/index.js'
import Notice from '../components/Notice.jsx'

const TITLE_MAX = 120
const DESC_MAX = 3000

function validate({ title, description }) {
  const errors = {}
  const t = title.trim().length
  const d = description.trim().length
  if (t < 5 || t > TITLE_MAX) errors.title = `Title must be 5 to ${TITLE_MAX} characters.`
  if (d < 10 || d > DESC_MAX) errors.description = 'Description must be 10 to 3,000 characters.'
  return errors
}

export default function PublicFeedback() {
  const { slug } = useParams()
  const [state, setState] = useState('loading') // loading | unavailable | form | sent
  const [name, setName] = useState('')
  const [form, setForm] = useState({ title: '', description: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    publicApi
      .get(slug)
      .then((data) => {
        if (cancelled) return
        setName(data.name)
        setState('form')
      })
      .catch(() => !cancelled && setState('unavailable'))
    return () => {
      cancelled = true
    }
  }, [slug])

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setServerError('')
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setBusy(true)
    try {
      await publicApi.submit(slug, { title: form.title.trim(), description: form.description.trim() })
      setForm({ title: '', description: '' })
      setState('sent')
    } catch (err) {
      setServerError(err.message) // keep the text so the visitor can retry
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') return <p className="public note">Loading…</p>

  if (state === 'unavailable') {
    return (
      <main className="public">
        <h1>This feedback page is unavailable</h1>
        <p style={{ marginTop: 12 }}>The link may be wrong or the page may have been removed.</p>
      </main>
    )
  }

  return (
    <main className="public">
      <h1>{name}</h1>
      <p style={{ marginTop: 8 }}>Tell us what went wrong or what we could improve.</p>

      <div className="public-card">
        {state === 'sent' ? (
          <div className="stack" role="status">
            <h2>Thanks, your feedback has been submitted.</h2>
            <button type="button" className="btn" onClick={() => setState('form')}>
              Send more feedback
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="stack" noValidate>
            {serverError && <Notice kind="error">{serverError}</Notice>}
            <div>
              <label htmlFor="title">Title</label>
              <input id="title" name="title" value={form.title} onChange={change} maxLength={TITLE_MAX + 50} aria-invalid={Boolean(errors.title)} aria-describedby="title-help" required />
              <p id="title-help" className={errors.title ? 'field-error' : 'field-hint'}>
                {errors.title || `A short summary. ${form.title.trim().length}/${TITLE_MAX}`}
              </p>
            </div>
            <div>
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" value={form.description} onChange={change} aria-invalid={Boolean(errors.description)} aria-describedby="desc-help" required />
              <p id="desc-help" className={errors.description ? 'field-error' : 'field-hint'}>
                {errors.description || `What happened, and what did you expect? ${form.description.trim().length}/${DESC_MAX.toLocaleString()}`}
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit feedback'}
            </button>
          </form>
        )}
      </div>

      <p className="public-foot">Powered by FeedbackForge</p>
    </main>
  )
}
