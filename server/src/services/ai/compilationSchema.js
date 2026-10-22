export const ACTION_TYPES = ['create_issue', 'update_existing', 'ignore_spam']
export const REASON_CATEGORIES = ['gibberish', 'promotional_spam', 'irrelevant_prank', 'irrelevant_spam']

// JSON Schema for Groq Structured Outputs (strict mode): every field required, no extra properties.
export const compilationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ACTION_TYPES },
          submissionIds: { type: 'array', items: { type: 'string' } },
          issueId: { type: ['string', 'null'] },
          title: { type: ['string', 'null'] },
          description: { type: ['string', 'null'] },
          reasonCategory: { type: ['string', 'null'], enum: [...REASON_CATEGORIES, null] },
        },
        required: ['type', 'submissionIds', 'issueId', 'title', 'description', 'reasonCategory'],
      },
    },
  },
  required: ['actions'],
}
