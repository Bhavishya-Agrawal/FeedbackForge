import { z } from 'zod'
import { HttpError } from '../utils/httpError.js'
import { ISSUE_STATUSES } from '../models/Issue.js'

const email = z
  .string({ message: 'Enter a valid email address.' })
  .trim()
  .toLowerCase()
  .pipe(z.string().max(254, { message: 'Enter a valid email address.' }).email({ message: 'Enter a valid email address.' }))

const productName = z
  .string({ message: 'Product name must be 2 to 80 characters.' })
  .trim()
  .min(2, { message: 'Product name must be 2 to 80 characters.' })
  .max(80, { message: 'Product name must be 2 to 80 characters.' })

const accountName = z
  .string({ message: 'Name must be 2 to 80 characters.' })
  .trim()
  .min(2, { message: 'Name must be 2 to 80 characters.' })
  .max(80, { message: 'Name must be 2 to 80 characters.' })

const productDescription = z
  .string({ message: 'Description must be 1 to 1,000 characters.' })
  .trim()
  .min(1, { message: 'Description must be 1 to 1,000 characters.' })
  .max(1000, { message: 'Description must be 1 to 1,000 characters.' })

export const registerSchema = z.object({
  name: accountName,
  email,
  // 72 is the most characters bcrypt will actually use
  password: z
    .string({ message: 'Password must be 8 to 72 characters.' })
    .min(8, { message: 'Password must be at least 8 characters.' })
    .max(72, { message: 'Password must be 72 characters or fewer.' }),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
})

export const productSchema = z.object({ name: productName, description: productDescription })

export const submissionSchema = z.object({
  title: z
    .string({ message: 'Title must be 5 to 120 characters.' })
    .trim()
    .min(5, { message: 'Title must be 5 to 120 characters.' })
    .max(120, { message: 'Title must be 5 to 120 characters.' }),
  description: z
    .string({ message: 'Description must be 10 to 3,000 characters.' })
    .trim()
    .min(10, { message: 'Description must be 10 to 3,000 characters.' })
    .max(3000, { message: 'Description must be 10 to 3,000 characters.' }),
})

export const statusSchema = z.enum(ISSUE_STATUSES, { message: 'Status must be open, planned, in_progress or resolved.' })

// Runs a Zod schema and turns failure into a 400 with the first readable message.
export function parse(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', result.error.issues[0]?.message || 'Invalid request.')
  }
  return result.data
}
