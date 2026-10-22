import { Submission } from '../models/Submission.js'
import { HttpError } from '../utils/httpError.js'
import { requireObjectId } from '../utils/objectId.js'
import { serializeSubmission } from '../utils/serializers.js'

const LIST_LIMIT = 200

export async function listSubmissions(req, res) {
  const workspaceId = req.workspace._id
  const [submissions, total] = await Promise.all([
    Submission.find({ workspaceId }).sort({ createdAt: -1, _id: -1 }).limit(LIST_LIMIT),
    Submission.countDocuments({ workspaceId }),
  ])
  res.json({ submissions: submissions.map(serializeSubmission), total })
}

export async function deleteSubmission(req, res) {
  const id = requireObjectId(req.params.id)
  const result = await Submission.deleteOne({ _id: id, workspaceId: req.workspace._id })
  if (result.deletedCount === 0) throw new HttpError(404, 'NOT_FOUND', 'Submission not found.')
  res.json({ success: true })
}

export async function clearSubmissions(req, res) {
  const result = await Submission.deleteMany({ workspaceId: req.workspace._id })
  res.json({ success: true, deleted: result.deletedCount })
}
