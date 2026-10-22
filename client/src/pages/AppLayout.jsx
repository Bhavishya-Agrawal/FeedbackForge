import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { compileApi, issuesApi, productsApi, submissionsApi } from '../api/index.js'
import { useAuth } from '../context/AuthContext.jsx'
import CopyLink from '../components/CopyLink.jsx'
import Notice from '../components/Notice.jsx'

function AccountMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <details className="account">
      <summary>{user.name || user.email}</summary>
      <div className="account-panel stack">
        <p className="small">Signed in as {user.email}</p>
        <button type="button" className="btn btn-block" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </details>
  )
}

export default function AppLayout() {
  const { productId } = useParams()
  const [workspace, setWorkspace] = useState(null)
  const [productLoading, setProductLoading] = useState(true)
  const [productError, setProductError] = useState('')
  const [submissions, setSubmissions] = useState([])
  const [total, setTotal] = useState(0)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [compiling, setCompiling] = useState(false)
  const [notice, setNotice] = useState(null)

  const reload = useCallback(async () => {
    try {
      const [s, i] = await Promise.all([submissionsApi.list(productId), issuesApi.list(productId)])
      setSubmissions(s.submissions)
      setTotal(s.total)
      setIssues(i.issues)
      setLoadError('')
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    let cancelled = false
    setProductLoading(true)
    setWorkspace(null)
    setProductError('')
    productsApi.get(productId)
      .then((data) => {
        if (!cancelled) {
          setWorkspace(data.workspace)
          setProductError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setProductError(err.message)
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false)
      })
    return () => { cancelled = true }
  }, [productId])

  useEffect(() => {
    reload()
  }, [reload])

  async function compile() {
    if (compiling) return
    setCompiling(true)
    setNotice(null)
    try {
      const result = await compileApi.run(productId)
      setNotice({ kind: result.partial ? 'partial' : 'success', result })
    } catch (err) {
      setNotice({ kind: 'error', message: err.message })
    } finally {
      setCompiling(false)
      await reload()
    }
  }

  if (productLoading) return <main className="narrow note">Loading product…</main>
  if (productError || !workspace) {
    return (
      <main className="narrow">
        <Notice kind="error" title="Could not open this product.">{productError || 'Product not found.'}</Notice>
        <p style={{ marginTop: 16 }}><Link to="/app">Back to products</Link></p>
      </main>
    )
  }

  const publicUrl = `${window.location.origin}/f/${workspace.slug}`

  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="row-between">
            <div className="row">
              <Link className="wordmark" to="/app">FeedbackForge</Link>
              <span className="header-workspace">{workspace.name}</span>
            </div>
            <AccountMenu />
          </div>
          <CopyLink url={publicUrl} id="public-link" />
        </div>
      </header>

      <div className="container page-body">
        <section className="panel compile-panel row-between" aria-labelledby="pending-heading">
          <div>
            <h2 id="pending-heading">Pending feedback</h2>
            <p style={{ marginTop: 6 }}>
              <span className="big-number">{total}</span> <span>{total === 1 ? 'submission waiting' : 'submissions waiting'}</span>
            </p>
            {compiling && (
              <p className="note" style={{ marginTop: 6 }} role="status">
                Grouping feedback into issues. This can take up to a minute. Please keep this page open.
              </p>
            )}
          </div>
          <button type="button" className="btn btn-primary" onClick={compile} disabled={compiling || total === 0}>
            {compiling ? 'Compiling…' : 'Compile'}
          </button>
        </section>

        {notice?.kind === 'error' && (
          <Notice kind="error" title="Compile failed." onDismiss={() => setNotice(null)}>
            {notice.message}
          </Notice>
        )}
        {notice && notice.kind !== 'error' && (
          <Notice title={notice.kind === 'partial' ? 'Partly compiled.' : notice.result.noWork ? 'Nothing to do.' : 'Done.'} onDismiss={() => setNotice(null)}>
            {notice.result.message}
            {!notice.result.noWork && (
              <>
                {' '}
                Processed {notice.result.summary.submissionsProcessed}. Issues created: {notice.result.summary.issuesCreated}. Existing issues updated:{' '}
                {notice.result.summary.issuesUpdated}. Spam ignored: {notice.result.summary.spamIgnored}. Remaining in inbox:{' '}
                {notice.result.summary.submissionsRemaining}.
              </>
            )}
          </Notice>
        )}

        <nav className="tabs" aria-label="Dashboard sections">
          <NavLink to={`/app/products/${encodeURIComponent(productId)}/inbox`} className="tab">
            Inbox ({total})
          </NavLink>
          <NavLink to={`/app/products/${encodeURIComponent(productId)}/issues`} className="tab">
            Issues ({issues.length})
          </NavLink>
        </nav>

        {loadError ? (
          <Notice kind="error" title="Could not load your data.">
            {loadError}{' '}
            <button type="button" className="btn btn-small" onClick={reload}>
              Try again
            </button>
          </Notice>
        ) : (
          <Outlet context={{ submissions, total, issues, loading, reload, publicUrl, productId }} />
        )}
      </div>
    </>
  )
}
