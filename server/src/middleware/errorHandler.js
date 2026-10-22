import { HttpError } from '../utils/httpError.js'

export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } })
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON.' } })
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is too large.' } })
  }
  if (err?.name === 'CastError') {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } })
  }

  // Log the real error on the server only; never send details to the client.
  console.error('Unhandled error:', err?.stack || err)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' } })
}
