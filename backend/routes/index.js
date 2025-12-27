const express = require('express')
const router = express.Router()
const { authMiddlewere, authorizeRoles } = require('../middleweres/authmiddlewere')

// Simple admin users endpoints (fallbacks)
router.get('/admin/users', authMiddlewere, authorizeRoles('admin'), async (req, res) => {
  res.json({ users: [] })
})

router.get('/admin/stats', authMiddlewere, authorizeRoles('admin'), async (req, res) => {
  res.json({ totalUsers: 0, activeToday: 0, totalEarnings: 0, totalWithdrawn: 0 })
})

// Tasks fallback
router.get('/tasks/activeTasks', async (req, res) => {
  res.json({ tasks: [] })
})

// Mount referral if present
try {
  router.use('/referral', require('./referral'))
} catch (e) {
  // ignore
}

module.exports = router
const express = require("express")
const router = express.Router()

router.use("/auth",require("./authRoute.js"))
router.use("/twitter", require("./twitter"))
router.use("/tasks",require("./adminTasks.js"))
router.use("/admin", require("./adminUsers.js"))
router.use("/admin/webhook-logs", require("./adminWebhookRoutes.js"))
// Ensure we load the canonical lowercase implementation to avoid casing duplicate includes
router.use('/referral', require('../../backend/routes/referral.js'))
router.use("/tasks",require("../routes/Tasks.js"))
router.use("/withdraw",require("../routes/withdraw.js"))
router.use('/verification', require('./verification'))
router.use('/campaigns', require('./campaigns'))
router.use('/transactions', require('./transactions'))
router.use('/user-tasks', require('./userTasks'));
router.use('/admin', require('./adminWebhookRoutes'));


module.exports = router