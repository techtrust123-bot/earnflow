// Minimal fallback implementation in case canonical lowercase path isn't available.
// This keeps the app from crashing on environments with different casings.
const express = require('express')
const router = express.Router()

router.get('/me', (req, res) => {
  res.json({ success: false, message: 'Referral route not available on this instance' })
})

module.exports = router
