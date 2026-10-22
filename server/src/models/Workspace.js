import mongoose from 'mongoose'

const workspaceSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Set and cleared by the server only (see compileService)
    isCompiling: { type: Boolean, default: false },
    compileStartedAt: { type: Date, default: null },
    isDeleting: { type: Boolean, default: false },
  },
  { timestamps: true }
)

workspaceSchema.index({ ownerId: 1, createdAt: -1 })

export const Workspace = mongoose.model('Workspace', workspaceSchema)
