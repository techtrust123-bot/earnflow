// const express = require("express")
// const router = express.Router()
//
// const {
//   connectTwitter,
//   twitterCallback
// } = require("../controllers/twitterAuth")

// // 1️⃣ Start Twitter OAuth
// router.get("/connect", protect, connectTwitter)

// // 2️⃣ Twitter Callback
// router.get("/callback", twitterCallback)



// module.exports = router




// routes/twitter.js
const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { protect } = require("../middleweres/authmiddlewere")

// Start OAuth flow
router.get('/connect', passport.authenticate('twitter'));

// Callback
router.get('/callback',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    res.redirect('/profile?twitter=linked');
  }
);

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

module.exports = router;