import { Submission } from '../models/Submission.js'
import { Workspace } from '../models/Workspace.js'
import { HttpError } from '../utils/httpError.js'
import { SLUG_PATTERN } from '../utils/slug.js'
import { parse, submissionSchema } from '../validators/schemas.js'

const unavailable = () => new HttpError(404, 'NOT_FOUND', 'This feedback page is unavailable.')

async function findBySlug(slug) {
  if (!SLUG_PATTERN.test(slug)) throw unavailable()
  const workspace = await Workspace.findOne({ slug, isDeleting: { $ne: true } }).select('name')
  if (!workspace) throw unavailable()
  return workspace
}

export async function getPublicWorkspace(req, res) {
  const workspace = await findBySlug(req.params.slug)
  res.json({ available: true, name: workspace.name })
}

export async function createPublicSubmission(req, res) {
  const workspace = await findBySlug(req.params.slug)
  const { title, description } = parse(submissionSchema, req.body)
  await Submission.create({ workspaceId: workspace._id, title, description })
  res.status(201).json({ success: true })
}
