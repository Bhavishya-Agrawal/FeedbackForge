import { compileWorkspace } from '../services/compilation/compileService.js'

export async function compile(req, res) {
  // The workspace comes from the authenticated session, never from the request body.
  const result = await compileWorkspace(req.workspace._id)
  res.json(result)
}
