const User = require('../models/user')

// GET /api/referral/me
exports.getMyReferral = async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: 'Not authenticated' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    // Ensure referral code exists
    if (!user.referralCode) {
      user.referralCode = 'EARN' + Math.floor(100000 + Math.random() * 900000)
      await user.save()
    }

    const rewardPerReferral = Number(process.env.REFERRAL_REWARD || 500)

    return res.json({
      success: true,
      referral: {
        code: user.referralCode,
        totalReferrals: user.referralsCount || 0,
        totalEarnedFromReferrals: user.referralsEarnings || 0,
        rewardPerReferral,
        recentReferrals: (user.recentReferrals || []).map(r => ({
          name: r.name || 'Unknown',
          date: r.date ? new Date(r.date).toISOString() : null,
          status: r.status || 'pending',
          reward: r.reward || rewardPerReferral
        }))
      }
    })
  } catch (err) {
    console.error('getMyReferral error', err)
    return res.status(500).json({ message: 'Server error' })
  }
}
