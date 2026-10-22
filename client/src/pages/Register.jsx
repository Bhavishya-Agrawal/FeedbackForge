import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Notice from '../components/Notice.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    const name = form.name.trim()
    if (name.length < 2 || name.length > 80) return setError('Name must be 2 to 80 characters.')

    setBusy(true)
    try {
      await register({ ...form, name })
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="narrow">
      <span className="wordmark">FeedbackForge</span>
      <h1>Create an account</h1>
      <form onSubmit={submit} className="stack" style={{ marginTop: 20 }} noValidate>
        {error && <Notice kind="error">{error}</Notice>}
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" autoComplete="name" maxLength={80} value={form.name} onChange={change} required />
        </div>
        <div>
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} required />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={change} required />
          <p className="field-hint">At least 8 characters.</p>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p style={{ marginTop: 20 }}>
        Already registered? <Link to="/login">Log in</Link>.
      </p>
    </main>
  )
}
