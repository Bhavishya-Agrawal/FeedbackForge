import { Issue } from '../models/Issue.js'
import { HttpError } from '../utils/httpError.js'
import { requireObjectId } from '../utils/objectId.js'
import { serializeIssue } from '../utils/serializers.js'
import { parse, statusSchema } from '../validators/schemas.js'

const LIST_LIMIT = 500

export async function listIssues(req, res) {
  const filter = { workspaceId: req.workspace._id }
  if (req.query.status !== undefined) filter.status = parse(statusSchema, req.query.status)
  const issues = await Issue.find(filter).sort({ updatedAt: -1, _id: -1 }).limit(LIST_LIMIT)
  res.json({ issues: issues.map(serializeIssue) })
}

export async function updateIssueStatus(req, res) {
  const id = requireObjectId(req.params.id)
  const status = parse(statusSchema, req.body?.status)
  const issue = await Issue.findOneAndUpdate(
    { _id: id, workspaceId: req.workspace._id },
    { $set: { status } },
    { new: true, runValidators: true }
  )
  if (!issue) throw new HttpError(404, 'NOT_FOUND', 'Issue not found.')
  res.json({ issue: serializeIssue(issue) })
}

export async function deleteIssue(req, res) {
  const id = requireObjectId(req.params.id)
  const result = await Issue.deleteOne({ _id: id, workspaceId: req.workspace._id })
  if (result.deletedCount === 0) throw new HttpError(404, 'NOT_FOUND', 'Issue not found.')
  res.json({ success: true })
}

export async function deleteIssuesByStatus(req, res) {
  const status = parse(statusSchema, req.query.status)
  const result = await Issue.deleteMany({ workspaceId: req.workspace._id, status })
  res.json({ success: true, deleted: result.deletedCount })
}
