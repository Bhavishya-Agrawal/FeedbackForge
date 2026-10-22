import test from 'node:test'
import assert from 'node:assert/strict'
import { AiValidationError, validateActions } from '../src/services/compilation/validateActions.js'

const ctx = () => ({ submissionIds: new Set(['S1', 'S2', 'S3']), issueIds: new Set(['I1']) })
const act = (over) => ({ type: 'create_issue', submissionIds: ['S1'], issueId: null, title: 'Checkout fails after discount', description: 'Reports describe checkout failing.', reasonCategory: null, ...over })
const run = (actions, c = ctx()) => validateActions({ actions }, c)

test('accepts a full valid result (create, update, ignore)', () => {
  const out = run([
    act({ submissionIds: ['S1'] }),
    act({ type: 'update_existing', submissionIds: ['S2'], issueId: 'I1', title: null, description: null }),
    act({ type: 'ignore_spam', submissionIds: ['S3'], title: null, description: null, reasonCategory: 'gibberish' }),
  ])
  assert.equal(out.length, 3)
})

test('groups several submissions into one create_issue', () => {
  const out = run([act({ submissionIds: ['S1', 'S2'] }), act({ type: 'ignore_spam', submissionIds: ['S3'], title: null, description: null, reasonCategory: 'irrelevant_spam' })])
  assert.deepEqual(out[0].submissionIds, ['S1', 'S2'])
})

test('rejects a missing submission id', () => {
  assert.throws(() => run([act({ submissionIds: ['S1', 'S2'] })]), AiValidationError)
})

test('rejects a repeated submission id', () => {
  assert.throws(() => run([act({ submissionIds: ['S1', 'S2'] }), act({ submissionIds: ['S2', 'S3'] })]), /more than once/)
})

test('rejects an unknown submission id', () => {
  assert.throws(() => run([act({ submissionIds: ['S1', 'S2', 'S3', 'S99'] })]), /unknown submission/)
})

test('rejects an unknown or missing issue id on update_existing', () => {
  const rest = act({ type: 'ignore_spam', submissionIds: ['S2', 'S3'], title: null, description: null, reasonCategory: 'gibberish' })
  assert.throws(() => run([act({ type: 'update_existing', submissionIds: ['S1'], issueId: 'I9', title: null, description: null }), rest]), /unknown issueId/)
  assert.throws(() => run([act({ type: 'update_existing', submissionIds: ['S1'], issueId: null, title: null, description: null }), rest]), AiValidationError)
})

test('rejects create_issue with an issueId, blank title, or too-short title', () => {
  const rest = act({ type: 'ignore_spam', submissionIds: ['S2', 'S3'], title: null, description: null, reasonCategory: 'gibberish' })
  assert.throws(() => run([act({ issueId: 'I1' }), rest]), AiValidationError)
  assert.throws(() => run([act({ title: '   ' }), rest]), AiValidationError)
  assert.throws(() => run([act({ title: 'Bug' }), rest]), AiValidationError)
})

test('rejects ignore_spam without a reason category', () => {
  assert.throws(() => run([act({ type: 'ignore_spam', submissionIds: ['S1', 'S2', 'S3'], title: null, description: null, reasonCategory: null })]), /reasonCategory/)
})

test('rejects an over-long title', () => {
  assert.throws(() => run([act({ submissionIds: ['S1', 'S2', 'S3'], title: 'x'.repeat(121) })]), AiValidationError)
})

test('rejects unknown action types and wrong shapes', () => {
  assert.throws(() => run([act({ type: 'drop_database', submissionIds: ['S1', 'S2', 'S3'] })]), AiValidationError)
  assert.throws(() => validateActions({ nope: 1 }, ctx()), AiValidationError)
  assert.throws(() => validateActions(null, ctx()), AiValidationError)
})

test('ignores extra fields such as status or reportCount instead of trusting them', () => {
  const out = run([act({ submissionIds: ['S1', 'S2', 'S3'], status: 'resolved', reportCount: 999, workspaceId: 'x' })])
  assert.equal(out[0].status, undefined)
  assert.equal(out[0].reportCount, undefined)
})

test('blank update title/description become null (no change)', () => {
  const out = run([
    act({ type: 'update_existing', submissionIds: ['S1', 'S2', 'S3'], issueId: 'I1', title: '  ', description: '' }),
  ])
  assert.equal(out[0].title, null)
  assert.equal(out[0].description, null)
})
