const express = require('express')
const router = express.Router()
const { authMiddlewere } = require('../middleweres/authmiddlewere')
const Device = require('../models/device')

// Return device status for current user
router.get('/status', authMiddlewere, async (req, res) => {
  try {
    const userId = req.user.id
    const devices = await Device.find({ user: userId }).sort({ lastUsed: -1 }).limit(20)
    const active = devices.find(d => d.isActive)
    return res.json({ devices, activeDevice: active ? active._id : null })
  } catch (e) {
    console.error('device status error', e)
    res.status(500).json({ message: 'Failed to load device status' })
  }
})

module.exports = router
