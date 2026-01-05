const express = require('express')
const router = express.Router()
const { protect } = require('../middleweres/authmiddlewere')
const { createUserTask } = require('../controllers/userTaskController')
const webhookController = require('../controllers/webhookLogController')

const authorizeRoles = require('../middleweres/roleMiddlewere')

// helper to safely register handlers — avoids crashes when a controller export is missing
const safeHandler = (h, name) => {
	if (typeof h === 'function') return h
	return (req, res) => res.status(501).json({ message: `${name} not implemented` })
}

router.post('/create', protect, safeHandler(createUserTask, 'createUserTask'),authorizeRoles("admin"),)
router.post('/webhook', safeHandler(webhookController.paystackWebhook, 'paystackWebhook'))

module.exports = router