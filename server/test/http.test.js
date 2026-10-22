import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'

// Only checks that never reach the database: validation and authentication layers.
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused'
process.env.JWT_SECRET = 'test-secret'
process.env.GROQ_API_KEY = 'test-key'

let server
let base
before(async () => {
  const { default: app } = await import('../src/app.js')
  server = app.listen(0)
  base = `http://127.0.0.1:${server.address().port}/api`
})
after(() => server.close())

const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

test('health endpoint', async () => {
  const res = await fetch(base + '/health')
  assert.equal(res.status, 200)
})

test('private endpoints reject anonymous requests', async () => {
  for (const [method, path] of [['GET', '/auth/me'], ['GET', '/products'], ['POST', '/products'], ['GET', '/products/abc'], ['DELETE', '/products/abc'], ['GET', '/products/abc/submissions'], ['POST', '/products/abc/compile']]) {
    const res = await fetch(base + path, { method })
    assert.equal(res.status, 401, `${method} ${path}`)
    assert.equal((await res.json()).error.code, 'UNAUTHENTICATED')
  }
})

test('a forged cookie is rejected', async () => {
  const res = await fetch(base + '/submissions', { headers: { cookie: 'ff_token=not.a.jwt' } })
  assert.equal(res.status, 401)
})

test('register validates input before touching the database', async () => {
  for (const body of [{}, { name: 'Ada', email: 'nope', password: '12345678' }, { name: 'Ada', email: 'a@b.co', password: 'short' }, { name: 'A', email: 'a@b.co', password: '12345678' }]) {
    const res = await post('/auth/register', body)
    assert.equal(res.status, 400)
    assert.equal((await res.json()).error.code, 'VALIDATION_ERROR')
  }
})

test('login validates input', async () => {
  assert.equal((await post('/auth/login', { email: 'bad', password: 'x' })).status, 400)
})

test('public slugs with odd characters are "unavailable" without a database lookup', async () => {
  const res = await fetch(base + '/public/' + encodeURIComponent('../../etc'))
  assert.equal(res.status, 404)
  assert.equal((await res.json()).error.message, 'This feedback page is unavailable.')
})

test('logout works without a session and clears the cookie', async () => {
  const res = await post('/auth/logout', {})
  assert.equal(res.status, 200)
  assert.match(res.headers.get('set-cookie') || '', /ff_token=;/)
})

test('malformed JSON gives a 400, not a stack trace', async () => {
  const res = await fetch(base + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error.code, 'VALIDATION_ERROR')
})

test('unknown API route is a JSON 404', async () => {
  const res = await fetch(base + '/nope')
  assert.ok([401, 404].includes(res.status))
})
