
import app from '../server/src/app.js'
import { connectDB } from '../server/src/config/db.js'

export default async function handler(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  const path = url.searchParams.get('__path') || ''

  url.searchParams.delete('__path')
  req.url = `/api/${path}${url.search}`

  await connectDB()
  return app(req, res)
}
