const express = require("express")
const { authMiddlewere, protect } = require("../middleweres/authmiddlewere")
const authorizeRoles = require("../middleweres/roleMiddlewere")
const { completeTwitterTask, completeTask, fetchUserCompletions } = require("../controllers/Task")
const { blockSuspended } = require("../middleweres/blockSuspended")
const router = express.Router()

// Legacy Twitter endpoint (for backward compatibility)
router.post(
  "/twitter/:id/complete",
  protect,
  blockSuspended,
  completeTwitterTask
)

// Generic task completion for all platforms
router.post(
  "/:id/complete",
  protect,
  blockSuspended,
  completeTask
)

// Alternative platform-specific endpoints
router.post(
  "/tiktok/:id/complete",
  protect,
  blockSuspended,
  completeTask
)

router.post(
  "/instagram/:id/complete",
  protect,
  blockSuspended,
  completeTask
)

router.post(
  "/facebook/:id/complete",
  protect,
  blockSuspended,
  completeTask
)

router.post(
  "/youtube/:id/complete",
  protect,
  blockSuspended,
  completeTask
)

// Get current user's completed (rewarded) tasks
router.get('/completions', protect, fetchUserCompletions)

module.exports = router