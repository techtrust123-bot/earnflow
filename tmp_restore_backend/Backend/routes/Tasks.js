const express = require("express")
const { authMiddlewere } = require("../middleweres/authmiddlewere")
const authorizeRoles = require("../middleweres/roleMiddlewere")
const { connectTwitter, twitterCallback } = require("../controllers/twitterAuth")
const { completeTwitterTask } = require("../controllers/Task")
const { blockSuspended } = require("../middleweres/blockSuspended")
const router = express.Router()

// router.post("/complete/:id",authMiddlewere,authorizeRoles("admin","user"),completeTask)
router.get("/twitter/connect", authMiddlewere, connectTwitter)
router.get("/twitter/callback", twitterCallback)

router.post(
  "/twitter/:id/complete",
  authMiddlewere,
  blockSuspended,
  completeTwitterTask
)


module.exports = router