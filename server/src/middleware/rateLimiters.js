import { rateLimit } from 'express-rate-limit'

const build = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message } }),
  })

export const authLimiter = build(20, 'Too many attempts. Please wait a few minutes and try again.')
export const publicSubmitLimiter = build(20, 'Too many submissions from this connection. Please try again later.')
