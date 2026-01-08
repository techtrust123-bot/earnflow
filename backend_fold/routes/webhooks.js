const express = require('express')
const router = express.Router()
const controller = require('../controllers/webhookLogController')

router.post('/paystack', controller.paystackWebhook)
router.post('/monnify', controller.monnifyWebhook)
router.post('/flutterwave', controller.flutterwaveWebhook)

module.exports = router
