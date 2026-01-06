const express = require('express')
const router = express.Router()
const { protect } = require('../middleweres/authmiddlewere')
const authorizeRoles = require('../middleweres/roleMiddlewere')
const controller = require('../controllers/userTaskController')
const webhookController = require('../controllers/webhookLogController')
const approvalController = require('../controllers/approvalController')

// Helper to ensure a handler is a function; if not, return a stub that responds 501
const ensureHandler = (ctrl, name) => {
	const fn = ctrl && ctrl[name]
	if (typeof fn === 'function') return fn
	return (req, res) => res.status(501).json({ message: `Handler ${name} not implemented` })
}

// Create task (user must be authenticated)
router.post('/create', protect, ensureHandler(controller, 'createTask'))
router.get('/mine', protect, ensureHandler(controller, 'getMyTasks'))

// Manual confirm (for testing external payments)
router.post('/confirm-payment', protect, authorizeRoles('admin'), ensureHandler(controller, 'confirmPayment'))

// Initialize external payment for a pending task
router.post('/pay', protect, ensureHandler(controller, 'payTask'))
router.post('/verify', protect, ensureHandler(controller, 'verifyPayment'))

// Check payment status by reference (protected)
router.get('/check-payment/:ref', protect, ensureHandler(controller, 'checkPayment'))

// Webhook route (public) for payment provider
router.post('/webhook', ensureHandler(controller, 'paymentWebhook'))
// Monnify-specific webhook (public)
router.post('/webhook/monnify', ensureHandler(webhookController, 'monnifyWebhook'))
// Paystack webhook
router.post('/webhook/paystack', ensureHandler(webhookController, 'paystackWebhook'))

// Admin: list pending approval requests
router.get('/admin/pending-approvals', protect, authorizeRoles('admin'), ensureHandler(approvalController, 'listPending'))
// Admin: review (approve/reject) a request
router.patch('/admin/approve/:id', protect, authorizeRoles('admin'), ensureHandler(approvalController, 'review'))
// Paystack webhook (public)
router.post('/webhook/paystack', ensureHandler(webhookController, 'paystackWebhook'))

// Get single campaign (owner or admin)
router.get('/:id', protect, ensureHandler(controller, 'getTaskById'))

// Admin management
router.get('/admin/list', protect, authorizeRoles('admin'), ensureHandler(controller, 'adminList'))
router.get('/admin/pending', protect, authorizeRoles('admin'), ensureHandler(controller, 'adminPending'))
router.get('/admin/debug/:id', protect, authorizeRoles('admin'), ensureHandler(controller, 'adminDebug'))
router.patch('/admin/:id', protect, authorizeRoles('admin'), ensureHandler(controller, 'adminUpdate'))

module.exports = router
