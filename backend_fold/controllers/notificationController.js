const Notification = require('../models/notification')

exports.listForUser = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id)
    if (!userId) return res.status(401).json({ success: false })

    const items = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50)
    return res.json({ success: true, notifications: items })
  } catch (err) {
    console.error('listForUser error', err)
    return res.status(500).json({ success: false })
  }
}

exports.markRead = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id)
    if (!userId) return res.status(401).json({ success: false })

    const id = req.params.id
    if (id === 'all') {
      await Notification.updateMany({ user: userId, read: false }, { read: true })
      return res.json({ success: true })
    }

    await Notification.findOneAndUpdate({ _id: id, user: userId }, { read: true })
    return res.json({ success: true })
  } catch (err) {
    console.error('markRead error', err)
    return res.status(500).json({ success: false })
  }
}
