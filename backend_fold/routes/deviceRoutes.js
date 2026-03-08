const express = require('express')
const router = express.Router()
const { authMiddlewere } = require('../middleweres/authmiddlewere')
const Device = require('../models/device')
const deviceFingerprint = require('../services/deviceFingerprint')

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

// Request device verification
router.post('/request-verification', authMiddlewere, async (req, res) => {
  try {
    const userId = req.user.id
    const result = await deviceFingerprint.requestDeviceVerification(userId, req)
    
    if (result.success) {
      res.json({ message: result.message })
    } else {
      res.status(400).json({ message: result.message })
    }
  } catch (error) {
    console.error('Request device verification error:', error)
    res.status(500).json({ message: 'Failed to send verification code' })
  }
})

// Verify device with code
router.post('/verify', authMiddlewere, async (req, res) => {
  try {
    const userId = req.user.id
    const { code, deviceId } = req.body

    let deviceIdToVerify = deviceId
    if (!deviceIdToVerify) {
      // Use current device fingerprint
      const { hash } = deviceFingerprint.generateDeviceFingerprint(req)
      const device = await Device.findOne({ user: userId, fingerprintHash: hash })
      deviceIdToVerify = device?._id
    }

    if (!deviceIdToVerify) {
      return res.status(400).json({ message: 'Device not found' })
    }

    const result = await deviceFingerprint.verifyDevice(deviceIdToVerify, userId, code)
    
    if (result.success) {
      res.json({ message: result.message })
    } else {
      res.status(400).json({ message: result.message })
    }
  } catch (error) {
    console.error('Verify device error:', error)
    res.status(500).json({ message: 'Failed to verify device' })
  }
})

module.exports = router
