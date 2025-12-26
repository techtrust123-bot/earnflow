const express = require('express')
const router = express.Router()
const { protect } = require('../middleweres/authmiddlewere')
const { createUserTask, monnifyWebhook } = require('../controllers/userTaskController')

// helper to safely register handlers — avoids crashes when a controller export is missing
const safeHandler = (h, name) => {
	if (typeof h === 'function') return h
	return (req, res) => res.status(501).json({ message: `${name} not implemented` })
}

router.post('/create', protect, safeHandler(createUserTask, 'createUserTask'))
router.post('/webhook', safeHandler(monnifyWebhook, 'monnifyWebhook'))

module.exports = router