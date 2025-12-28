const express = require('express')
const router = express.Router()
const User = require('../models/user')
const { protect } = require('../middleweres/authmiddlewere')

// GET /api/referral/me - return referral info for authenticated user
router.get('/me', protect, async (req, res) => {
  try {
    const user = req.user
    // If protect middleware attached full user doc
    const doc = (user && user._id) ? user : await User.findById(user.id || user._id)
    if (!doc) return res.status(404).json({ success: false, message: 'User not found' })

    const rewardPerReferral = Number(process.env.REFERRAL_REWARD || process.env.REFERRAL_REWARD_AMOUNT || 50)

    const referral = {
      code: doc.referralCode || doc.userID || '',
      totalReferrals: doc.referrals || 0,
      totalEarnedFromReferrals: doc.referralsEarned || 0,
      rewardPerReferral,
      recentReferrals: doc.recentReferrals || []
    }

    return res.json({ success: true, referral })
  } catch (err) {
    console.error('GET /api/referral/me error', err)
    return res.status(500).json({ success: false, message: 'Could not fetch referral info' })
  }
})

module.exports = router
