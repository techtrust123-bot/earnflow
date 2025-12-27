const express = require("express")
const router = express.Router()

router.use("/auth",require("./authRoute.js"))
router.use("/twitter", require("./twitter"))
router.use("/tasks",require("./adminTasks.js"))
router.use("/admin", require("./adminUsers.js"))
router.use("/admin/webhook-logs", require("./adminWebhookRoutes.js"))
router.use("/tasks",require("../routes/Tasks.js"))
router.use("/withdraw",require("../routes/withdraw.js"))
router.use('/verification', require('./verification'))
router.use('/campaigns', require('./campaigns'))
router.use('/transactions', require('./transactions'))
router.use('/user-tasks', require('./userTasks'));
router.use('/admin', require('./adminWebhookRoutes'));


module.exports = router