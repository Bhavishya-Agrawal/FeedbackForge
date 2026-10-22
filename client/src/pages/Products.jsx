import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { productsApi } from '../api/index.js'
import { useAuth } from '../context/AuthContext.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
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
        <button type="button" className="btn btn-block" onClick={handleLogout}>Log out</button>
      </div>
    </details>
  )
}

export default function Products() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function loadProducts() {
    setError('')
    try {
      const data = await productsApi.list()
      setProducts(data.products)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  async function createProduct(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { product } = await productsApi.create({
        name: form.name.trim(),
        description: form.description.trim(),
      })
      setProducts((current) => [product, ...current])
      setForm({ name: '', description: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteProduct() {
    setError('')
    setDeleting(true)
    try {
      await productsApi.remove(pendingDelete.id)
      setProducts((current) => current.filter((product) => product.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      setError(err.message)
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="container row-between">
          <Link className="wordmark" to="/app">FeedbackForge</Link>
          <AccountMenu />
        </div>
      </header>
      <main className="container page-body products-page">
        <div className="products-heading">
          <p className="small">Welcome, {user.name || user.email}</p>
          <h1>Your products</h1>
          <p className="products-intro">Choose a product to review its feedback, or add a product to get started.</p>
        </div>

        {error && (
          <Notice kind="error" title="Could not load or save products." onDismiss={() => setError('')}>
            {error}
            {!loading && products.length === 0 && (
              <>
                {' '}
                <button type="button" className="btn btn-small" onClick={loadProducts}>Try again</button>
              </>
            )}
          </Notice>
        )}

        {loading ? (
          <p className="note" role="status">Loading products…</p>
        ) : (
          <section className="product-list-section" aria-labelledby="products-list-heading">
            <h2 id="products-list-heading">Products ({products.length})</h2>
            {products.length === 0 ? (
              <div className="empty product-empty">
                <h3>No products yet.</h3>
                <p>Add your first product below to create a feedback page.</p>
              </div>
            ) : (
              <ul className="product-list">
                {products.map((product) => (
                  <li key={product.id}>
                    <div className="product-list-item">
                      <Link className="product-card" to={`/app/products/${encodeURIComponent(product.id)}`}>
                        <span className="product-card-arrow" aria-hidden="true">→</span>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                      </Link>
                      <button
                        type="button"
                        className="btn btn-small product-delete"
                        onClick={() => setPendingDelete(product)}
                        disabled={deleting}
                        aria-label={`Delete ${product.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="panel product-form-panel" aria-labelledby="add-product-heading">
          <h2 id="add-product-heading">Add a product</h2>
          <p className="small">Each product gets its own feedback link, inbox, and issue board.</p>
          <form onSubmit={createProduct} className="stack product-form">
            <div>
              <label htmlFor="product-name">Product name</label>
              <input
                id="product-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                minLength={2}
                maxLength={80}
                required
              />
            </div>
            <div>
              <label htmlFor="product-description">Description</label>
              <textarea
                id="product-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                maxLength={1000}
                required
              />
              <p className="field-hint">A short description to help you identify the product.</p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy || loading}>
              {busy ? 'Adding…' : 'Add product'}
            </button>
          </form>
        </section>
      </main>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.name}?`}
        busy={deleting}
        onConfirm={deleteProduct}
        onCancel={() => setPendingDelete(null)}
      >
        <p>This permanently deletes the product, its feedback submissions, and its issues. This cannot be undone.</p>
      </ConfirmDialog>
    </>
  )
}
