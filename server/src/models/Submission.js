import mongoose from 'mongoose'

const submissionSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
  },
  { timestamps: true }
)

submissionSchema.index({ workspaceId: 1, createdAt: -1 })

export const Submission = mongoose.model('Submission', submissionSchema)
