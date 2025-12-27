const express = require('express')
const router = express.Router()
const { protect } = require('../middleweres/authmiddlewere')
const Payment = require('../models/payment')
const UserTask = require('../models/userTask')

// GET /api/transactions - return user transactions (payments)
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const payments = await Payment.find({ user: userId }).sort({ createdAt: -1 }).limit(200)

    const transactions = await Promise.all(payments.map(async p => {
      let desc = 'Payment'
      if (p.task) {
        const t = await UserTask.findById(p.task).select('action link')
        if (t) desc = `Task payment: ${t.action} ${t.link || ''}`
      }
      return {
        id: p._id,
        type: p.amount >= 0 ? 'credit' : 'debit',
        amount: p.amount,
        description: desc,
        date: p.createdAt,
        status: p.status || 'pending'
      }
    }))

    return res.json({ success: true, transactions })
  } catch (err) {
    console.error('transactions route error', err)
    return res.status(500).json({ message: 'Could not fetch transactions' })
  }
})

module.exports = router
