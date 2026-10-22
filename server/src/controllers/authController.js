import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { clearAuthCookie, setAuthCookie, signToken } from '../middleware/auth.js'
import { HttpError } from '../utils/httpError.js'
import { serializeUser } from '../utils/serializers.js'
import { loginSchema, parse, registerSchema } from '../validators/schemas.js'

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10)

export async function register(req, res) {
  const { name, email, password } = parse(registerSchema, req.body)

  if (await User.exists({ email })) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists. Try logging in.')
  }

  try {
    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
    })
    setAuthCookie(res, signToken(user._id))
    res.status(201).json(serializeUser(user))
  } catch (err) {
    if (err?.code === 11000) {
      throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists. Try logging in.')
    }
    throw err
  }
}

export async function login(req, res) {
  const { email, password } = parse(loginSchema, req.body)
  const user = await User.findOne({ email }).select('+passwordHash')
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH)
  if (!user || !ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')

  setAuthCookie(res, signToken(user._id))
  res.json(serializeUser(user))
}

export function logout(req, res) {
  clearAuthCookie(res)
  res.json({ success: true })
}

export function me(req, res) {
  res.json(serializeUser(req.user))
}
