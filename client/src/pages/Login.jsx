import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Notice from '../components/Notice.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(form)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="narrow">
      <span className="wordmark">FeedbackForge</span>
      <h1>Log in</h1>
      <form onSubmit={submit} className="stack" style={{ marginTop: 20 }}>
        {error && <Notice kind="error">{error}</Notice>}
        <div>
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} required />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={change} required />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p style={{ marginTop: 20 }}>
        No account? <Link to="/register">Create one</Link>.
      </p>
    </main>
  )
}
