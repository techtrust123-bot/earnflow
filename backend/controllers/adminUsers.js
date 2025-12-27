const User = require('../models/user')

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -verifyOtp -resendOtp -resetOtp')
    res.json({ users })
  } catch (err) {
    console.error('getUsers error', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const activeToday = await User.countDocuments({ lastActive: { $gt: since } })

    const agg = await User.aggregate([
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
    ])
    const totalEarnings = (agg[0] && agg[0].totalBalance) || 0

    // totalWithdrawn not tracked on User model - return 0 for now
    const totalWithdrawn = 0

    res.json({ totalUsers, activeToday, totalEarnings, totalWithdrawn })
  } catch (err) {
    console.error('getStats error', err)
    res.status(500).json({ message: 'Server error' })
  }
}






