import { Router } from 'express'
import { requireAuth, requireWorkspace } from '../middleware/auth.js'
import { authLimiter, publicSubmitLimiter } from '../middleware/rateLimiters.js'
import * as auth from '../controllers/authController.js'
import * as workspace from '../controllers/workspaceController.js'
import * as publicApi from '../controllers/publicController.js'
import * as submissions from '../controllers/submissionController.js'
import * as issues from '../controllers/issueController.js'
import { compile } from '../controllers/compileController.js'

const router = Router()

// Public
router.post('/auth/register', authLimiter, auth.register)
router.post('/auth/login', authLimiter, auth.login)
router.post('/auth/logout', auth.logout)
router.get('/public/:slug', publicApi.getPublicWorkspace)
router.post('/public/:slug/submissions', publicSubmitLimiter, publicApi.createPublicSubmission)

// Everything below needs a valid session
router.use(requireAuth)
router.get('/auth/me', auth.me)
router.get('/products', workspace.listWorkspaces)
router.post('/products', workspace.createProduct)
router.use('/products/:productId', requireWorkspace)
router.get('/products/:productId', workspace.getWorkspace)
router.delete('/products/:productId', workspace.deleteProduct)

router.get('/products/:productId/submissions', submissions.listSubmissions)
router.delete('/products/:productId/submissions', submissions.clearSubmissions)
router.delete('/products/:productId/submissions/:id', submissions.deleteSubmission)

router.post('/products/:productId/compile', compile)

router.get('/products/:productId/issues', issues.listIssues)
router.delete('/products/:productId/issues', issues.deleteIssuesByStatus)
router.patch('/products/:productId/issues/:id/status', issues.updateIssueStatus)
router.delete('/products/:productId/issues/:id', issues.deleteIssue)

export default router
