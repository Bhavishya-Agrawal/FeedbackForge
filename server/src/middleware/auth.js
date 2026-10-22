import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { Workspace } from '../models/Workspace.js'
import { HttpError } from '../utils/httpError.js'
import { requireObjectId } from '../utils/objectId.js'

export const COOKIE_NAME = 'ff_token'

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpiresIn })
}

function cookieOptions() {
  return { httpOnly: true, secure: env.isProd || env.cookieSameSite === 'none', sameSite: env.cookieSameSite, path: '/' }
}

export function setAuthCookie(res, token) {
  // The cookie expires exactly when the JWT does
  const { exp } = jwt.decode(token)
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), expires: new Date(exp * 1000) })
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions())
}

const unauthenticated = () => new HttpError(401, 'UNAUTHENTICATED', 'Please log in to continue.')

// Resolves the user from the database on every request.
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) throw unauthenticated()

  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] })
  } catch {
    throw unauthenticated()
  }

  const user = await User.findById(payload.sub)
  if (!user) throw unauthenticated()
  req.user = user
  next()
}

export async function requireWorkspace(req, res, next) {
  const id = requireObjectId(req.params.productId)
  const workspace = await Workspace.findOne({ _id: id, ownerId: req.user._id, isDeleting: { $ne: true } })
  if (!workspace) throw new HttpError(404, 'NOT_FOUND', 'Product not found.')
  req.workspace = workspace
  next()
}
