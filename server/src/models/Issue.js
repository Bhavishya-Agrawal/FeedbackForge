import mongoose from 'mongoose'

export const ISSUE_STATUSES = ['open', 'planned', 'in_progress', 'resolved']

const issueSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    reportCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      validate: { validator: Number.isInteger, message: 'reportCount must be an integer' },
    },
    status: { type: String, enum: ISSUE_STATUSES, default: 'open', required: true },
  },
  { timestamps: true }
)

issueSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 })

export const Issue = mongoose.model('Issue', issueSchema)
