const express = require('express')
const router = express.Router()

const {
  listWebhookLogs,
  getWebhookLog
} = require('../controllers/webhookLogController')

const { authMiddlewere } = require('../middleweres/authmiddlewere')
const authorizeRoles = require('../middleweres/roleMiddlewere')

// Admin only
router.get('/webhook-logs', authMiddlewere, authorizeRoles('admin'), listWebhookLogs)
router.get('/webhook-logs/:id', authMiddlewere, authorizeRoles('admin'), getWebhookLog)

module.exports = router
