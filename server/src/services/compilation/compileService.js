import mongoose from 'mongoose'
import { env } from '../../config/env.js'
import { supportsTransactions } from '../../config/db.js'
import { Issue } from '../../models/Issue.js'
import { Submission } from '../../models/Submission.js'
import { Workspace } from '../../models/Workspace.js'
import { HttpError } from '../../utils/httpError.js'
import { AiProviderError, requestCompilation } from '../ai/groqService.js'
import { AiValidationError, validateActions } from './validateActions.js'

const STALE_LOCK_MS = 10 * 60 * 1000
const MAX_EXISTING_ISSUES = 100 // keeps the prompt small; the most recently active issues are sent
const ISSUE_DESCRIPTION_PREVIEW = 300

class ConflictAbort extends Error {}

// ---------- per-workspace lock ----------

async function acquireLock(workspaceId) {
  const now = new Date()
  const locked = await Workspace.findOneAndUpdate(
    {
      _id: workspaceId,
      isDeleting: { $ne: true },
      $or: [{ isCompiling: false }, { compileStartedAt: { $lt: new Date(now.getTime() - STALE_LOCK_MS) } }],
    },
    { $set: { isCompiling: true, compileStartedAt: now } }
  )
  return Boolean(locked)
}

const releaseLock = (workspaceId) =>
  Workspace.updateOne({ _id: workspaceId }, { $set: { isCompiling: false, compileStartedAt: null } })

// ---------- applying a validated batch ----------

// Issue changes first, then delete the raw submissions. In a transaction the order is irrelevant;
// without one, this order can at worst double count after a crash, but never lose feedback.
async function applyPlan(workspaceId, plan, submissionDbIds, session) {
  const opts = session ? { session } : {}
  let issuesCreated = 0
  let spamIgnored = 0
  const updatedIssueIds = new Set()

  for (const action of plan) {
    const count = action.submissionDbIds.length

    if (action.type === 'create_issue') {
      await Issue.create(
        [{ workspaceId, title: action.title, description: action.description, status: 'open', reportCount: count }],
        opts
      )
      issuesCreated += 1
    } else if (action.type === 'update_existing') {
      const set = {}
      if (action.title) set.title = action.title
      if (action.description) set.description = action.description
      const update = { $inc: { reportCount: count } }
      if (Object.keys(set).length > 0) update.$set = set

      const issue = await Issue.findOneAndUpdate({ _id: action.issueDbId, workspaceId }, update, {
        ...opts,
        new: true,
        runValidators: true,
      })
      if (!issue) throw new ConflictAbort('An issue was deleted while compiling.')
      updatedIssueIds.add(String(issue._id))
    } else {
      spamIgnored += count
    }
  }

  const deleted = await Submission.deleteMany({ _id: { $in: submissionDbIds }, workspaceId }, opts)
  if (session && deleted.deletedCount !== submissionDbIds.length) {
    throw new ConflictAbort('Some submissions were deleted while compiling.') // aborts the transaction
  }

  return { issuesCreated, issuesUpdated: updatedIssueIds.size, updatedIssueIds, spamIgnored }
}

async function commitBatch(workspaceId, plan, submissionDbIds) {
  if (supportsTransactions()) {
    return mongoose.connection.transaction((session) => applyPlan(workspaceId, plan, submissionDbIds, session))
  }
  return applyPlan(workspaceId, plan, submissionDbIds, null)
}

// ---------- one batch: ask, validate (retry once), commit ----------

async function processBatch(workspaceId, batch) {
  const submissionByAlias = new Map(batch.map((s, i) => [`S${i + 1}`, s]))

  const existing = await Issue.find({ workspaceId }).sort({ updatedAt: -1, _id: -1 }).limit(MAX_EXISTING_ISSUES).lean()
  const issueByAlias = new Map(existing.map((issue, i) => [`I${i + 1}`, issue]))

  const submissionsForAi = [...submissionByAlias].map(([id, s]) => ({ id, title: s.title, description: s.description }))
  const issuesForAi = [...issueByAlias].map(([id, i]) => ({
    id,
    title: i.title,
    description: i.description.slice(0, ISSUE_DESCRIPTION_PREVIEW),
    status: i.status,
    reportCount: i.reportCount,
  }))

  let actions
  let correction = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await requestCompilation({ submissions: submissionsForAi, issues: issuesForAi, correction })
      actions = validateActions(raw, {
        submissionIds: new Set(submissionByAlias.keys()),
        issueIds: new Set(issueByAlias.keys()),
      })
      break
    } catch (err) {
      const retryable = err instanceof AiValidationError || (err instanceof AiProviderError && err.kind === 'invalid')
      if (!retryable || attempt === 1) throw err
      correction = err.message
    }
  }

  // Translate the aliases back to real database ids. Only the server decides what gets written.
  const plan = actions.map((a) => ({
    ...a,
    submissionDbIds: a.submissionIds.map((alias) => submissionByAlias.get(alias)._id),
    issueDbId: a.issueId ? issueByAlias.get(a.issueId)._id : null,
  }))
  const submissionDbIds = batch.map((s) => s._id)

  const result = await commitBatch(workspaceId, plan, submissionDbIds)
  return { ...result, processed: batch.length }
}

// ---------- turning errors into messages the owner can act on ----------

function describeFailure(err) {
  if (err instanceof AiProviderError) {
    if (err.kind === 'rate_limit') {
      return { status: 503, code: 'AI_RATE_LIMITED', message: 'The AI provider is rate limiting requests. Wait a minute and try again.' }
    }
    if (err.kind === 'unavailable') {
      return { status: 503, code: 'AI_UNAVAILABLE', message: 'The AI provider is unavailable right now. Try again shortly.' }
    }
    if (err.kind === 'config') {
      return { status: 502, code: 'AI_CONFIG_ERROR', message: 'The AI provider is not configured correctly (API key, model or response format). Check the server logs.' }
    }
  }
  if (err instanceof AiProviderError || err instanceof AiValidationError) {
    console.error('AI answer rejected:', err.message)
    return { status: 502, code: 'AI_INVALID_RESPONSE', message: 'The AI returned an answer that could not be used. Your feedback is untouched. Try again.' }
  }
  if (err instanceof ConflictAbort) {
    return { status: 409, code: 'CONFLICT', message: 'The inbox changed while compiling, so this batch was not saved. Try again.' }
  }
  console.error('Compile failed:', err?.stack || err)
  return { status: 500, code: 'COMPILE_FAILED', message: 'Compiling failed on the server. Your feedback is untouched. Try again.' }
}

// ---------- public entry point ----------

export async function compileWorkspace(workspaceId) {
  if (!(await acquireLock(workspaceId))) {
    throw new HttpError(409, 'CONFLICT', 'A compile is already running for this workspace. Please wait for it to finish.')
  }

  const totals = { submissionsProcessed: 0, issuesCreated: 0, spamIgnored: 0 }
  const updatedIssueIds = new Set()
  let failure = null
  let remaining = 0

  try {
    for (let i = 0; i < env.aiMaxBatches; i++) {
      const batch = await Submission.find({ workspaceId }).sort({ createdAt: 1, _id: 1 }).limit(env.aiBatchSize).lean()
      if (batch.length === 0) break

      try {
        const result = await processBatch(workspaceId, batch)
        totals.submissionsProcessed += result.processed
        totals.issuesCreated += result.issuesCreated
        totals.spamIgnored += result.spamIgnored
        result.updatedIssueIds.forEach((id) => updatedIssueIds.add(id))
      } catch (err) {
        failure = describeFailure(err)
        break // earlier batches stay committed; this batch's submissions stay in the inbox
      }
    }
    remaining = await Submission.countDocuments({ workspaceId })
  } finally {
    await releaseLock(workspaceId)
  }

  const summary = { ...totals, issuesUpdated: updatedIssueIds.size, submissionsRemaining: remaining }

  if (failure) {
    if (totals.submissionsProcessed === 0) throw new HttpError(failure.status, failure.code, failure.message)
    return {
      success: true,
      partial: true,
      summary,
      message: `Compiled ${totals.submissionsProcessed} submissions, then stopped. ${failure.message} ${remaining} remain in the inbox.`,
    }
  }

  if (totals.submissionsProcessed === 0) {
    return { success: true, partial: false, noWork: true, summary, message: 'Your inbox is empty. There is nothing to compile.' }
  }
  if (remaining > 0) {
    return {
      success: true,
      partial: true,
      summary,
      message: `Compiled ${totals.submissionsProcessed} submissions. ${remaining} remain in the inbox. Press Compile again to continue.`,
    }
  }
  return { success: true, partial: false, summary, message: 'Feedback compiled successfully.' }
}
