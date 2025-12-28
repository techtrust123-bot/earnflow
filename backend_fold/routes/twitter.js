// routes/twitter.js
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { protect } = require("../middleweres/authmiddlewere")  // ← Fixed spelling

// 1. Start Twitter OAuth
router.get('/auth', passport.authenticate('twitter', {
  scope: ['tweet.read', 'users.read', 'follows.read', 'follows.write']
}))

// 2. Callback from Twitter
router.get('/callback',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  (req, res) => {
    // SUCCESS! Redirect to your frontend
    res.redirect(`${process.env.FRONTEND_URL}/profile?twitter=linked`)
    //                     ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
    //              Change this to your frontend port (5173 = Vite)
  }
)

// 3. Unlink Twitter Account
router.delete('/unlink', protect, async (req, res) => {
  try {
    req.user.twitter = undefined
    await req.user.save()
    
    res.json({ 
      success: true, 
      message: "Twitter account unlinked successfully" 
    })
  } catch (err) {
    console.error("Unlink error:", err)
    res.status(500).json({ 
      success: false, 
      message: "Failed to unlink Twitter" 
    })
  }
})

module.exports = router