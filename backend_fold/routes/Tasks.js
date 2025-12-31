const express = require("express")
const { authMiddlewere, protect } = require("../middleweres/authmiddlewere")
const authorizeRoles = require("../middleweres/roleMiddlewere")
const { connectTwitter, twitterCallback } = require("../controllers/twitterAuth")
const { completeTwitterTask, fetchUserCompletions } = require("../controllers/Task")
const { blockSuspended } = require("../middleweres/blockSuspended")
const router = express.Router()



router.post(
  "/twitter/:id/complete",
  protect,
  blockSuspended,
  completeTwitterTask
)

// Get current user's completed (rewarded) tasks
router.get('/completions', protect, fetchUserCompletions)


module.exports = router