import { Workspace } from '../models/Workspace.js'
import { Issue } from '../models/Issue.js'
import { Submission } from '../models/Submission.js'
import { serializeWorkspace } from '../utils/serializers.js'
import { randomSuffix, slugify } from '../utils/slug.js'
import { HttpError } from '../utils/httpError.js'
import { parse, productSchema } from '../validators/schemas.js'

export async function listWorkspaces(req, res) {
  const products = await Workspace.find({ ownerId: req.user._id }).sort({ createdAt: -1, _id: -1 })
  res.json({ products: products.map(serializeWorkspace) })
}

async function createWorkspace(ownerId, name, description) {
  let slug = slugify(name)
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await Workspace.create({ ownerId, name, description, slug })
    } catch (err) {
      if (err?.code !== 11000 || !err.keyPattern?.slug) throw err
      slug = `${slugify(name)}-${randomSuffix()}`
    }
  }
  throw new HttpError(500, 'INTERNAL_ERROR', 'Could not create a feedback address. Please try again.')
}

export async function createProduct(req, res) {
  const { name, description } = parse(productSchema, req.body)
  const product = await createWorkspace(req.user._id, name, description)
  res.status(201).json({ product: serializeWorkspace(product) })
}

export function getWorkspace(req, res) {
  res.json({ workspace: serializeWorkspace(req.workspace) })
}

export async function deleteProduct(req, res) {
  const product = await Workspace.findOneAndUpdate(
    {
      _id: req.workspace._id,
      ownerId: req.user._id,
      isCompiling: { $ne: true },
      isDeleting: { $ne: true },
    },
    { $set: { isDeleting: true } },
    { new: true }
  )
  if (!product) {
    throw new HttpError(409, 'PRODUCT_BUSY', 'This product is currently being compiled or deleted. Try again shortly.')
  }

  try {
    await Submission.deleteMany({ workspaceId: product._id })
    await Issue.deleteMany({ workspaceId: product._id })
    const result = await Workspace.deleteOne({ _id: product._id, ownerId: req.user._id, isDeleting: true })
    if (result.deletedCount !== 1) {
      throw new HttpError(409, 'PRODUCT_BUSY', 'This product could not be deleted. Please try again.')
    }
    res.json({ success: true })
  } catch (err) {
    await Workspace.updateOne(
      { _id: product._id, ownerId: req.user._id, isDeleting: true },
      { $set: { isDeleting: false } }
    )
    throw err
  }
}
