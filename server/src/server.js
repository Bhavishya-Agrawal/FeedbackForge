import app from './app.js'
import { connectDB } from './config/db.js'
import { env } from './config/env.js'

try {
  await connectDB()
  app.listen(env.port, () => console.log(`FeedbackForge API listening on port ${env.port}`))
} catch (err) {
  console.error('Failed to start the server:', err.message)
  process.exit(1)
}
