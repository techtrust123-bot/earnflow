const express = require("express")
const router = express.Router()

// Health check endpoint for quick reachability tests
router.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

router.use("/auth",require("./authRoute.js"))
router.use("/twitter", require("./twitter.js"))
router.use("/tasks",require("./adminTasks.js"))
router.use("/admin", require("./adminUsers.js"))
router.use("/admin/webhook-logs", require("./adminWebhookRoutes.js"))
router.use("/tasks",require("./Tasks.js"))
router.use("/withdraw",require("./withdraw.js"))
router.use('/verification', require('./verification.js'))
router.use('/campaigns', require('./campaigns.js'))
router.use('/transactions', require('./transactions.js'))
router.use('/webhooks', require('./webhooks'))
router.use('/user-tasks', require('./userTasks.js'));
router.use('/referral', require('./referral.js'));
router.use('/admin/settings', require('./adminSettings.js'))
router.use('/admin', require('./adminWebhookRoutes.js'));
router.use('/notifications', require('./notifications.js'))
router.use('/support', require('./support.js'))
router.use('/data-airtime', require('./dataAirtime.js'))


module.exports = router