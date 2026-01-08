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

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id
    if (!userId) return res.status(400).json({ message: 'User id required' })

    // Prevent admin deleting themselves via admin panel
    if (req.user && req.user.id && req.user.id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account from admin panel' })
    }

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    await User.findByIdAndDelete(userId)

    res.json({ success: true, message: 'User deleted' })
  } catch (err) {
    console.error('deleteUser error', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// PATCH /api/admin/users/:id/role
exports.updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id
    const { role } = req.body

    if (!userId) return res.status(400).json({ message: 'User id required' })
    if (!role) return res.status(400).json({ message: 'Role is required' })

    // Validate role
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "admin" or "user"' })
    }

    // Prevent admin changing their own role via admin panel
    if (req.user && req.user.id && req.user.id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'Cannot change your own role from admin panel' })
    }

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    // Update role
    user.role = role
    await user.save()

    res.json({ success: true, message: `User role updated to ${role}`, user: { _id: user._id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    console.error('updateUserRole error', err)
    res.status(500).json({ message: 'Server error' })
  }
}






