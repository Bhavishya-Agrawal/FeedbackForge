import test, { mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused'
process.env.JWT_SECRET = 'test-secret'
process.env.GROQ_API_KEY = 'test-key'
process.env.AI_BATCH_SIZE = '2'
process.env.AI_MAX_BATCHES_PER_COMPILE = '5'

// ---- tiny in-memory stand-ins for the database and for Groq ----
const state = { subs: [], issues: [], locked: false, nextId: 1, aiCalls: [], ai: () => ({ actions: [] }) }
const chain = (rows) => ({ sort() { return this }, limit(n) { this.n = n; return this }, lean() { return Promise.resolve(rows().slice(0, this.n ?? 1e9).map((r) => ({ ...r }))) } })
const matches = (doc, filter) => String(doc._id) === String(filter._id)

const Submission = {
  find: () => chain(() => state.subs),
  countDocuments: async () => state.subs.length,
  deleteMany: async (filter) => {
    const ids = new Set(filter._id.$in.map(String))
    const before = state.subs.length
    state.subs = state.subs.filter((s) => !ids.has(String(s._id)))
    return { deletedCount: before - state.subs.length }
  },
}
const Issue = {
  find: () => chain(() => state.issues),
  create: async ([doc]) => { state.issues.push({ ...doc, _id: `issue${state.nextId++}` }); return [doc] },
  findOneAndUpdate: async (filter, update) => {
    const issue = state.issues.find((i) => matches(i, filter))
    if (!issue) return null
    issue.reportCount += update.$inc.reportCount
    Object.assign(issue, update.$set || {})
    return issue
  },
}
const Workspace = {
  findOneAndUpdate: async () => { if (state.locked) return null; state.locked = true; return { _id: 'w' } },
  updateOne: async () => { state.locked = false },
}

const url = (p) => new URL(p, import.meta.url).href
mock.module(url('../src/models/Issue.js'), { namedExports: { Issue, ISSUE_STATUSES: ['open', 'planned', 'in_progress', 'resolved'] } })
mock.module(url('../src/models/Submission.js'), { namedExports: { Submission } })
mock.module(url('../src/models/Workspace.js'), { namedExports: { Workspace } })
mock.module(url('../src/config/db.js'), { namedExports: { supportsTransactions: () => false } })

const { AiProviderError } = await import('../src/services/ai/groqService.js')
mock.module(url('../src/services/ai/groqService.js'), {
  namedExports: {
    AiProviderError,
    requestCompilation: async (input) => { state.aiCalls.push(input); return state.ai(input, state.aiCalls.length) },
  },
})
const { compileWorkspace } = await import('../src/services/compilation/compileService.js')

const addSubs = (n) => { for (let i = 1; i <= n; i++) state.subs.push({ _id: `sub${i}`, title: `Report ${i}`, description: `Description of report ${i}` }) }
const create = (ids, title = 'A real problem title') => ({ type: 'create_issue', submissionIds: ids, issueId: null, title, description: 'Summary of the problem.', reasonCategory: null })
const update = (ids, issueId, extra = {}) => ({ type: 'update_existing', submissionIds: ids, issueId, title: null, description: null, reasonCategory: null, ...extra })
const spam = (ids) => ({ type: 'ignore_spam', submissionIds: ids, issueId: null, title: null, description: null, reasonCategory: 'gibberish' })

beforeEach(() => {
  Object.assign(state, { subs: [], issues: [], locked: false, nextId: 1, aiCalls: [], ai: () => ({ actions: [] }) })
})

test('groups two reports into one issue with count 2 and updates an existing issue', async () => {
  state.issues.push({ _id: 'old', title: 'Existing issue title', description: 'Old text', status: 'planned', reportCount: 5 })
  addSubs(2) // one batch of two
  state.ai = () => ({ actions: [create(['S1', 'S2'])] })
  let r = await compileWorkspace('w')
  assert.equal(r.summary.issuesCreated, 1)
  assert.equal(state.issues.find((i) => i._id !== 'old').reportCount, 2)
  assert.equal(state.issues.find((i) => i._id !== 'old').status, 'open')
  assert.equal(r.summary.submissionsRemaining, 0)
  assert.equal(r.partial, false)

  addSubs(2)
  state.ai = ({ issues }) => {
    const oldAlias = issues.find((i) => i.title === 'Existing issue title').id
    return { actions: [update(['S1'], oldAlias, { description: 'Better text' }), spam(['S2'])] }
  }
  r = await compileWorkspace('w')
  const old = state.issues.find((i) => i._id === 'old')
  assert.equal(old.reportCount, 6) // +1 only, even though the description changed
  assert.equal(old.description, 'Better text')
  assert.equal(old.status, 'planned') // the model cannot touch status
  assert.equal(r.summary.issuesUpdated, 1)
  assert.equal(r.summary.spamIgnored, 1)
  assert.equal(state.subs.length, 0)
  assert.equal(state.locked, false)
})

test('a matching report with no new detail still increments once', async () => {
  state.issues.push({ _id: 'old', title: 'Existing issue title', description: 'Old text', status: 'open', reportCount: 3 })
  addSubs(1)
  state.ai = ({ issues }) => ({ actions: [update(['S1'], issues[0].id)] })
  await compileWorkspace('w')
  assert.equal(state.issues[0].reportCount, 4)
  assert.equal(state.issues[0].description, 'Old text')
})

test('retries once after an invalid answer, then succeeds', async () => {
  addSubs(2)
  state.ai = (input, call) => (call === 1 ? { actions: [create(['S1'])] } : { actions: [create(['S1', 'S2'])] })
  const r = await compileWorkspace('w')
  assert.equal(state.aiCalls.length, 2)
  assert.match(state.aiCalls[1].correction, /not assigned/)
  assert.equal(r.summary.submissionsProcessed, 2)
})

test('two invalid answers: nothing is deleted or created, error is returned, lock released', async () => {
  addSubs(2)
  state.ai = () => ({ actions: [create(['S1'])] }) // always misses S2
  await assert.rejects(compileWorkspace('w'), (err) => err.status === 502 && err.code === 'AI_INVALID_RESPONSE')
  assert.equal(state.subs.length, 2)
  assert.equal(state.issues.length, 0)
  assert.equal(state.locked, false)
})

test('provider failure on the first batch loses nothing', async () => {
  addSubs(3)
  state.ai = () => { throw new AiProviderError('rate_limit', 'x') }
  await assert.rejects(compileWorkspace('w'), (err) => err.status === 503 && err.code === 'AI_RATE_LIMITED')
  assert.equal(state.subs.length, 3)
})

test('later batch failing keeps earlier results and reports a partial compile', async () => {
  addSubs(4) // two batches of two
  state.ai = (input, call) => {
    if (call === 1) return { actions: [create(['S1', 'S2'])] }
    throw new AiProviderError('unavailable', 'x')
  }
  const r = await compileWorkspace('w')
  assert.equal(r.partial, true)
  assert.equal(r.summary.submissionsProcessed, 2)
  assert.equal(r.summary.submissionsRemaining, 2)
  assert.equal(state.issues.length, 1)
  assert.deepEqual(state.subs.map((s) => s._id), ['sub3', 'sub4'])

  // Retrying counts the leftover submissions once and does not touch the committed issue
  state.ai = () => ({ actions: [create(['S1', 'S2'], 'Another real problem')] })
  const r2 = await compileWorkspace('w')
  assert.equal(r2.partial, false)
  assert.equal(state.issues.length, 2)
  assert.equal(state.issues[0].reportCount, 2)
  assert.equal(state.issues[1].reportCount, 2)
})

test('hitting the batch limit leaves the rest queued and says so', async () => {
  addSubs(12) // 5 batches x 2 = 10 processed, 2 remain
  state.ai = ({ submissions }) => ({ actions: submissions.map((s, i) => create([s.id], `Problem number ${state.nextId}${i}`)) })
  const r = await compileWorkspace('w')
  assert.equal(r.partial, true)
  assert.equal(r.summary.submissionsProcessed, 10)
  assert.equal(r.summary.submissionsRemaining, 2)
})

test('a second compile while one is running gets a 409', async () => {
  addSubs(2)
  state.locked = true
  await assert.rejects(compileWorkspace('w'), (err) => err.status === 409)
  assert.equal(state.subs.length, 2)
  assert.equal(state.locked, true) // someone else's lock is not released by the loser
})

test('empty inbox is a clear no-work response', async () => {
  const r = await compileWorkspace('w')
  assert.equal(r.noWork, true)
  assert.equal(state.aiCalls.length, 0)
  assert.equal(state.locked, false)
})

test('aliases, not database ids, are what the model sees', async () => {
  addSubs(1)
  state.ai = ({ submissions }) => ({ actions: [create([submissions[0].id])] })
  await compileWorkspace('w')
  assert.match(state.aiCalls[0].submissions[0].id, /^S\d+$/)
})
