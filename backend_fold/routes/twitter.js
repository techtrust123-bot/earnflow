const express = require("express")
const router = express.Router()
const { protect } = require("../middleweres/authmiddlewere")
const {
  connectTwitter,
  twitterCallback
} = require("../controllers/twitterAuth")

// 1️⃣ Start Twitter OAuth
router.get("/connect", protect, connectTwitter)

// 2️⃣ Twitter Callback
router.get("/callback", twitterCallback)

// 3️⃣ Unlink Twitter
router.delete("/unlink", protect, async (req, res) => {
  try {
    req.user.twitter = undefined
    await req.user.save()

    res.json({
      success: true,
      message: "Twitter account unlinked successfully"
    })
  } catch (err) {
    console.error("Unlink Twitter error:", err)
    res.status(500).json({
      success: false,
      message: "Failed to unlink Twitter account"
    })
  }
})

module.exports = router
