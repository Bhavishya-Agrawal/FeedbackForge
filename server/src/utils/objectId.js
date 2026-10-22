import mongoose from 'mongoose'
import { HttpError } from './httpError.js'

// Treat any malformed id exactly like a missing record.
export function requireObjectId(value) {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value) || String(new mongoose.Types.ObjectId(value)) !== value.toLowerCase()) {
    throw new HttpError(404, 'NOT_FOUND', 'Not found.')
  }
  return value
}
