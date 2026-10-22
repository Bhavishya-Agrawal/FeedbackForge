import { z } from 'zod'
import { ACTION_TYPES, REASON_CATEGORIES } from '../ai/compilationSchema.js'

export const LIMITS = { titleMin: 5, titleMax: 120, descriptionMax: 5000 }

// Thrown when the model's answer is unusable. The message is safe to send back to the model as a correction.
export class AiValidationError extends Error {}

const rawResult = z.object({
  actions: z.array(
    z.object({
      type: z.enum(ACTION_TYPES),
      submissionIds: z.array(z.string()),
      issueId: z.string().nullable(),
      title: z.string().nullable(),
      description: z.string().nullable(),
      reasonCategory: z.enum(REASON_CATEGORIES).nullable(),
    })
  ),
})

const blankToNull = (value) => (typeof value === 'string' && value.trim() === '' ? null : value)
const fail = (message) => {
  throw new AiValidationError(message)
}

function checkText(value, { label, min, max }) {
  const text = value.trim()
  if (text.length < min || text.length > max) fail(`${label} must be between ${min} and ${max} characters.`)
  return text
}

/**
 * Checks the model's output against the batch it was given. Nothing is applied here.
 * @param raw          parsed JSON from the model
 * @param submissionIds  Set of the ids (aliases) that were sent in this batch
 * @param issueIds       Set of the existing issue ids (aliases) that were sent
 * @returns normalised actions: { type, submissionIds, issueId, title, description, reasonCategory }
 */
export function validateActions(raw, { submissionIds, issueIds }) {
  const parsed = rawResult.safeParse(raw)
  if (!parsed.success) fail('The response did not match the required JSON shape.')

  const seen = new Set()
  const actions = parsed.data.actions.map((action, index) => {
    const where = `Action ${index + 1} (${action.type})`

    if (action.submissionIds.length === 0) fail(`${where} has no submissionIds.`)
    for (const id of action.submissionIds) {
      if (!submissionIds.has(id)) fail(`${where} references unknown submission id "${id}".`)
      if (seen.has(id)) fail(`Submission id "${id}" is assigned more than once.`)
      seen.add(id)
    }

    const title = blankToNull(action.title)
    const description = blankToNull(action.description)

    if (action.type === 'create_issue') {
      if (action.issueId !== null) fail(`${where} must have issueId null.`)
      if (action.reasonCategory !== null) fail(`${where} must have reasonCategory null.`)
      if (title === null || description === null) fail(`${where} needs a non-empty title and description.`)
      return {
        type: action.type,
        submissionIds: action.submissionIds,
        issueId: null,
        title: checkText(title, { label: `${where} title`, min: LIMITS.titleMin, max: LIMITS.titleMax }),
        description: checkText(description, { label: `${where} description`, min: 1, max: LIMITS.descriptionMax }),
        reasonCategory: null,
      }
    }

    if (action.type === 'update_existing') {
      if (action.issueId === null || !issueIds.has(action.issueId)) fail(`${where} references an unknown issueId.`)
      if (action.reasonCategory !== null) fail(`${where} must have reasonCategory null.`)
      return {
        type: action.type,
        submissionIds: action.submissionIds,
        issueId: action.issueId,
        title: title === null ? null : checkText(title, { label: `${where} title`, min: LIMITS.titleMin, max: LIMITS.titleMax }),
        description:
          description === null ? null : checkText(description, { label: `${where} description`, min: 1, max: LIMITS.descriptionMax }),
        reasonCategory: null,
      }
    }

    // ignore_spam
    if (action.issueId !== null) fail(`${where} must have issueId null.`)
    if (action.reasonCategory === null) fail(`${where} needs a reasonCategory.`)
    return {
      type: action.type,
      submissionIds: action.submissionIds,
      issueId: null,
      title: null,
      description: null,
      reasonCategory: action.reasonCategory,
    }
  })

  const missing = [...submissionIds].filter((id) => !seen.has(id))
  if (missing.length > 0) fail(`These submission ids were not assigned to any action: ${missing.join(', ')}.`)

  return actions
}
