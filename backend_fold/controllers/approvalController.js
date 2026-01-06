const TaskApproval = require('../models/taskApproval')
const User = require('../models/user')
const Notification = require('../models/notification')
const transporter = require('../transporter/transporter')

exports.requestApproval = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id)
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' })

    const { title, platform, action, socialHandle, numUsers, url, description } = req.body
    if (!title || !platform || !action) return res.status(400).json({ success: false, message: 'Missing required fields' })

    const doc = await TaskApproval.create({
      owner: userId,
      title: title.trim(),
      platform,
      action,
      socialHandle: socialHandle ? socialHandle.trim() : undefined,
      numUsers: numUsers ? Number(numUsers) : undefined,
      url: url ? url.trim() : undefined,
      description: description ? description.trim() : undefined
    })

    // Optionally: notify admins (out of scope here)

    return res.json({ success: true, message: 'Request created', id: doc._id })
  } catch (err) {
    console.error('requestApproval error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Admin: list pending requests
exports.listPending = async (req, res) => {
  try {
    const docs = await TaskApproval.find({ status: 'requested' }).sort({ createdAt: -1 }).populate('owner', 'name email')
    return res.json({ success: true, tasks: docs })
  } catch (err) {
    console.error('listPending error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// list approved (for admin)
exports.listApproved = async (req, res) => {
  try {
    const docs = await TaskApproval.find({ status: 'approved' }).sort({ createdAt: -1 }).populate('owner', 'name email')
    return res.json({ success: true, tasks: docs })
  } catch (err) {
    console.error('listApproved error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// User: initialize payment for an approved request
exports.payApproval = async (req, res) => {
  try {
    const id = req.params.id
    const userId = req.user && (req.user._id || req.user.id)
    if (!userId) return res.status(401).json({ success: false })

    const ap = await TaskApproval.findById(id)
    if (!ap) return res.status(404).json({ success: false, message: 'Approval not found' })
    if (String(ap.owner) !== String(userId)) return res.status(403).json({ success: false })
    if (ap.status !== 'approved') return res.status(400).json({ success: false, message: 'Not approved' })
    if (ap.paid) return res.status(400).json({ success: false, message: 'Already paid' })

    const currency = req.body.currency === 'USD' ? 'USD' : 'NGN'

    // compute amount: 100 * numUsers (in NGN). If USD requested, convert
    const perUserNgn = 100
    const totalNgn = perUserNgn * (ap.numUsers || 1)

    // get conversion if needed
    let chargeAmount = totalNgn
    if (currency === 'USD') {
      // convert NGN -> USD using exchangerate.host
      const conv = await require('axios').get(`https://api.exchangerate.host/convert?from=NGN&to=USD&amount=${totalNgn}`)
      const usd = conv.data && conv.data.result ? conv.data.result : null
      if (!usd) return res.status(500).json({ success: false, message: 'Conversion failed' })
      chargeAmount = usd
    }

    // initialize paystack transaction
    const paystack = require('../services/paystack')
    const user = await User.findById(userId)
    const reference = `APR_${Date.now()}_${id}`
    const init = await paystack.initializeTransaction({ email: user.email, amount: chargeAmount, currency, reference })
    if (!init.requestSuccessful) return res.status(500).json({ success: false, message: init.responseMessage })

    // create a Payment record to track
    try {
      await Payment.create({ user: userId, approval: id, reference, amount: chargeAmount, status: 'pending', method: 'paystack', currency })
    } catch (e) { console.warn('create Payment failed', e && e.message) }

    return res.json({ success: true, data: init.responseBody })
  } catch (err) {
    console.error('payApproval error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Admin: approve or reject
exports.review = async (req, res) => {
  try {
    const id = req.params.id
    const { action } = req.body // 'approve' or 'reject'
    if (!['approve','reject'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' })

    const doc = await TaskApproval.findById(id)
    if (!doc) return res.status(404).json({ success: false, message: 'Request not found' })

    doc.status = action === 'approve' ? 'approved' : 'rejected'
    doc.reviewedBy = req.user && (req.user._id || req.user.id)
    doc.reviewedAt = new Date()
    await doc.save()

      // Create in-app notification
      try {
        const owner = await User.findById(doc.owner)
        const title = doc.status === 'approved' ? 'Task Approved' : 'Task Rejected'
        const message = doc.status === 'approved' ? `Your task request "${doc.title}" was approved by admin.` : `Your task request "${doc.title}" was rejected.`
        await Notification.create({ user: doc.owner, title, message, meta: { approvalId: doc._id, status: doc.status } })

        // Send email if user has email configured and transporter available
        if (owner && owner.email) {
          const mailOptions = {
            from: process.env.GMAIL_USER,
            to: owner.email,
            subject: title,
            text: `${message}\n\nRegards,\nTeam`
          }
          transporter.sendMail(mailOptions).catch(err => console.warn('email send failed', err && err.message))
        }
      } catch (e) {
        console.warn('notify user error', e && e.message)
      }

      return res.json({ success: true, message: `Request ${doc.status}` })
  } catch (err) {
    console.error('review error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
