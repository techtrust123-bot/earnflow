const express = require('express')
const router = express.Router()
const { protect } = require('../middleweres/authmiddlewere')
const notificationController = require('../controllers/notificationController')

router.get('/', protect, notificationController.listForUser)
router.patch('/read/:id', protect, notificationController.markRead)

module.exports = router
