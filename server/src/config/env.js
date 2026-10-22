import 'dotenv/config'

const missing = ['MONGODB_URI', 'JWT_SECRET', 'GROQ_API_KEY'].filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`)
  process.exit(1)
}

const positiveInt = (value, fallback, max) => {
  const n = Number.parseInt(value, 10)
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback
}

export const env = {
  isProd: process.env.NODE_ENV === 'production',
  port: positiveInt(process.env.PORT, 5000, 65535),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSameSite: ['lax', 'strict', 'none'].includes(process.env.COOKIE_SAME_SITE) ? process.env.COOKIE_SAME_SITE : 'lax',
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  groqUseJsonSchema: process.env.GROQ_USE_JSON_SCHEMA !== 'false',
  aiBatchSize: positiveInt(process.env.AI_BATCH_SIZE, 15, 50),
  aiMaxBatches: positiveInt(process.env.AI_MAX_BATCHES_PER_COMPILE, 5, 20),
}
