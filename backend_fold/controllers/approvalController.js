const TaskApproval = require('../models/taskApproval')
const User = require('../models/user')
const Notification = require('../models/notification')
const transporter = require('../transporter/transporter')
const Payment = require('../models/payment')
const UserTask = require('../models/userTask')
const exchangeRate = require('../services/exchangeRate')

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
    const ids = docs.map(d => d._id)
    // find payments for these approvals, sort newest first and pick latest per approval
    const payments = await Payment.find({ approval: { $in: ids } }).sort({ createdAt: -1 }).lean()
    const payMap = {}
    for (const p of payments) {
      if (!p || !p.approval) continue
      const key = String(p.approval)
      if (!payMap[key]) payMap[key] = p // first occurrence is the latest due to sort
    }
    const out = docs.map(d => {
      const obj = d.toObject ? d.toObject() : d
      obj.payment = payMap[String(d._id)] || null
      return obj
    })
    return res.json({ success: true, tasks: out })
  } catch (err) {
    console.error('listPending error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// list approved (for admin)
exports.listApproved = async (req, res) => {
  try {
    const docs = await TaskApproval.find({ status: 'approved' }).sort({ createdAt: -1 }).populate('owner', 'name email')
    const ids = docs.map(d => d._id)
    const payments = await Payment.find({ approval: { $in: ids } }).sort({ createdAt: -1 }).lean()
    const payMap = {}
    for (const p of payments) {
      if (!p || !p.approval) continue
      const key = String(p.approval)
      if (!payMap[key]) payMap[key] = p
    }
    const out = docs.map(d => {
      const obj = d.toObject ? d.toObject() : d
      obj.payment = payMap[String(d._id)] || null
      return obj
    })
    return res.json({ success: true, tasks: out })
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
      try {
        // convert NGN -> USD using exchangeRate.ngnToUsd (exchangeRate service uses USD->NGN internally)
        chargeAmount = await exchangeRate.ngnToUsd(totalNgn)
      } catch (e) {
        console.error('conversion error (exchangeRate)', e && e.message)
        // fallback: allow admin override USD_NGN_RATE to derive USD amount
        const override = parseFloat(process.env.USD_NGN_RATE || '')
        if (!isNaN(override) && override > 0) {
          chargeAmount = Number((totalNgn / override).toFixed(2))
          console.warn('using env override USD_NGN_RATE for conversion', { override, totalNgn, chargeAmount })
        } else {
          return res.status(500).json({ success: false, message: 'Conversion failed' })
        }
      }
    }

    // initialize paystack transaction
    const paystack = require('../services/paystack')
    const user = await User.findById(userId)
    const reference = `APR_${Date.now()}_${id}`

    // Initialize payment in the currency requested by the user.
    // If user requested USD, use the converted USD amount; otherwise use NGN.
    const payCurrency = currency === 'USD' ? 'USD' : 'NGN'
    const payAmount = payCurrency === 'USD' ? chargeAmount : totalNgn

    let init = await paystack.initializeTransaction({ email: user.email, amount: payAmount, currency: payCurrency, reference })

    // Normal failure handling: but sometimes Paystack returns useful `data` even when `status` is false.
    // If `responseBody` already contains checkout details (authorization_url/access_code/reference), treat it as success.
    if (!init.requestSuccessful) {
      const rb = init.responseBody || {}
      const hasCheckout = !!(rb.authorization_url || rb.access_code || rb.reference)
      if (hasCheckout) {
        const usedRef = rb.reference || reference
        try {
          await Payment.create({ user: userId, approval: id, reference: usedRef, amount: payAmount, status: 'pending', method: 'paystack', currency: payCurrency })
        } catch (e) { console.warn('create Payment failed', e && e.message) }

        const responsePayload = { ...rb, chargedAmount: payAmount, chargedCurrency: payCurrency }
        if (currency === 'USD') responsePayload.requested = { currency: 'USD', amount: chargeAmount }
        return res.json({ success: true, data: responsePayload })
      }

      const msg = String(init.responseMessage || '').toLowerCase()
      const bodyMsg = String((init.responseBody && init.responseBody.message) || '').toLowerCase()
      const currencyError = msg.includes('currency not supported') || bodyMsg.includes('currency not supported') || (bodyMsg.includes('currency') && bodyMsg.includes('not supported'))
      if (currency === 'USD' && currencyError) {
        try {
          // retry initializing in NGN using the NGN total
          const fallbackReference = `${reference}_NGN`
          const retry = await paystack.initializeTransaction({ email: user.email, amount: totalNgn, currency: 'NGN', reference: fallbackReference })
          if (retry.requestSuccessful) {
            // swap to the successful init and adjust the reference/currency/amount used for records
            init = retry
            payCurrency = 'NGN'
            // record that the backend fell back from USD -> NGN
            // create Payment using actual initialized amount
            try { await Payment.create({ user: userId, approval: id, reference: fallbackReference, amount: totalNgn, status: 'pending', method: 'paystack', currency: 'NGN' }) } catch (e) { console.warn('create Payment failed', e && e.message) }

            // include fallback info (rate) for frontend display
            let rate = null
            try { rate = await exchangeRate.getRate() } catch (e) { /* ignore */ }
            const responsePayload = { ...init.responseBody, chargedAmount: totalNgn, chargedCurrency: 'NGN', fallback: { from: 'USD', to: 'NGN', rate } }
            if (currency === 'USD') responsePayload.requested = { currency: 'USD', amount: chargeAmount }
            return res.json({ success: true, data: responsePayload })
          }
        } catch (e) {
          console.warn('fallback NGN init failed', e && e.message)
        }
      }

      return res.status(500).json({ success: false, message: init.responseMessage || init.responseBody || 'Payment initialization failed' })
    }

    // create a Payment record to track (store what was actually initialized with Paystack)
    try {
      await Payment.create({ user: userId, approval: id, reference, amount: payAmount, status: 'pending', method: 'paystack', currency: payCurrency })
    } catch (e) { console.warn('create Payment failed', e && e.message) }

    // Return init response plus conversion info if user requested USD so frontend can display equivalents
    const responsePayload = { ...init.responseBody, chargedAmount: payAmount, chargedCurrency: payCurrency }
    if (currency === 'USD') responsePayload.requested = { currency: 'USD', amount: chargeAmount }

    return res.json({ success: true, data: responsePayload })
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

// Admin: create UserTask(s) from a paid approval
exports.createTasks = async (req, res) => {
  try {
    const id = req.params.id
    const approval = await TaskApproval.findById(id)
    if (!approval) return res.status(404).json({ success: false, message: 'Approval not found' })
    if (approval.status !== 'approved') return res.status(400).json({ success: false, message: 'Approval is not approved' })
    if (!approval.paid) return res.status(400).json({ success: false, message: 'Approval not paid yet' })

    // create a UserTask record representing the campaign
    const perUserAmount = 100
    const baseAmount = perUserAmount * (approval.numUsers || 1)
    const commission = Math.round(baseAmount * 0.10)
    const totalAmount = baseAmount + commission

    const newTask = await UserTask.create({
      user: approval.owner,
      socialHandle: approval.socialHandle || approval.url || approval.title || '',
      numUsers: approval.numUsers || 1,
      taskAmount: perUserAmount,
      totalAmount: totalAmount,
      commission: commission,
      taskDetails: approval.description || approval.title || '',
      paymentReference: null,
      paymentStatus: 'paid',
      isActive: true
    })

    // link any payment record for this approval to the created task
    try {
      const payment = await Payment.findOne({ approval: approval._id })
      if (payment) {
        payment.task = newTask._id
        await payment.save()
      }
    } catch (e) { console.warn('link payment to task failed', e && e.message) }

    // mark approval as completed (optional)
    approval.status = 'completed'
    await approval.save()

    // notify owner
    try {
      await Notification.create({ user: approval.owner, title: 'Tasks Created', message: `Your approved campaign "${approval.title}" has been turned into active tasks by admin.` , meta: { approvalId: approval._id, taskId: newTask._id } })
      const owner = await User.findById(approval.owner)
      if (owner && owner.email) {
        const mailOptions = { from: process.env.GMAIL_USER, to: owner.email, subject: 'Your campaign is live', text: `Your campaign "${approval.title}" is now live.` }
        transporter.sendMail(mailOptions).catch(err => console.warn('email send failed', err && err.message))
      }
    } catch (e) { console.warn('notify owner after createTasks failed', e && e.message) }

    return res.json({ success: true, task: newTask })
  } catch (err) {
    console.error('createTasks error', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
