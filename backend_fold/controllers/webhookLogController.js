const WebhookLog = require('../models/webhookLog')
const crypto = require('crypto')
const Payment = require('../models/payment')
const UserTask = require('../models/userTask')
const Notification = require('../models/notification')
const transporter = require('../transporter/transporter')
const User = require('../models/user')


/**
 * GET /api/admin/webhook-logs?page=1&limit=25&provider=monnify
 */
exports.listWebhookLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'))
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '25')))
    const provider = req.query.provider

    const filter = {}
    if (provider) filter.provider = provider

    const total = await WebhookLog.countDocuments(filter)

    const logs = await WebhookLog.find(filter)
      .sort({ receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('receivedAt provider method path task')

    return res.json({
      success: true,
      page,
      limit,
      total,
      logs
    })
  } catch (err) {
    console.error('listWebhookLogs error', err)
    return res.status(500).json({ message: 'Server error' })
  }
}

/**
 * GET /api/admin/webhook-logs/:id
 */
exports.getWebhookLog = async (req, res) => {
  try {
    const { id } = req.params

    const log = await WebhookLog.findById(id)
    if (!log) {
      return res.status(404).json({ message: 'Webhook log not found' })
    }

    return res.json({
      success: true,
      log: {
        id: log._id,
        receivedAt: log.receivedAt,
        provider: log.provider,
        method: log.method,
        path: log.path,
        payload: log.payload,
        verification: log.verification,
        task: log.task
      }
    })
  } catch (err) {
    console.error('getWebhookLog error', err)
    return res.status(500).json({ message: 'Server error' })
  }
}

// POST /api/webhooks/monnify
exports.monnifyWebhook = async (req, res) => {
  const signature = req.headers['monnify-signature'] || req.headers['x-monnify-signature']
  const payload = req.body

  // Create a log entry immediately so we can reconcile later
  const log = await WebhookLog.create({ payload, provider: 'monnify', method: req.method, path: req.originalUrl })

  // Respond fast to the provider to avoid timeouts; process asynchronously
  res.status(200).send('OK')

  ;(async () => {
    try {
      const hash = crypto.createHmac('sha512', process.env.MONNIFY_SECRET_KEY || '')
        .update(JSON.stringify(payload))
        .digest('hex')

      if (!signature || hash !== signature) {
        log.verification = { ok: false, reason: 'invalid signature' }
        await log.save()
        return
      }

      const paymentReference = payload.paymentReference || payload.reference || payload.transactionReference
      const paymentStatus = payload.paymentStatus || payload.status || payload.txStatus

      if (!paymentReference) {
        log.verification = { ok: false, reason: 'no reference in payload' }
        await log.save()
        return
      }

      const payment = await Payment.findOne({ reference: paymentReference })
      if (!payment) {
        log.verification = { ok: false, reason: 'payment not found' }
        await log.save()
        return
      }

      // update payment record and activate task if paid
      if (String(paymentStatus).toLowerCase().includes('paid') || String(paymentStatus).toLowerCase().includes('success')) {
        payment.status = 'successful'
        payment.meta = Object.assign({}, payment.meta || {}, { webhookPayload: payload })
        await payment.save()

        if (payment.task) {
          await UserTask.findByIdAndUpdate(payment.task, { paid: true, status: 'active' })
        }

        // update transaction record if exists
        try {
          const Transaction = require('../models/transaction')
          const tx = await Transaction.findOne({ reference: payment.reference })
          if (tx) {
            tx.status = 'successful'
            await tx.save()
          }
        } catch (e) {
          console.warn('webhook: could not update transaction', e.message || e)
        }

        log.verification = { ok: true, matchedPayment: payment._id }
        log.task = payment.task
        await log.save()
        // Notify admins about the successful payment
        try {
          const admins = await User.find({ role: 'admin' }).lean()
          const title = 'Payment Received'
          const message = `Payment ${payment.reference} of ${payment.amount} ${payment.currency} received.`
          for (const a of admins) {
            try {
              await Notification.create({ user: a._id, title, message, meta: { payment: payment._id } })
              if (a.email) {
                transporter.sendMail({ from: process.env.SENDER_EMAIL, to: a.email, subject: title, text: message }).catch(() => {})
              }
            } catch (e) { console.warn('notify admin failed', e && e.message) }
          }
        } catch (e) { console.warn('webhook: admin notify failed', e && e.message) }
      } else {
        if (isWalletFunding) {
          walletTransaction.status = 'failed'
          walletTransaction.meta.paystack_data = data
          await walletTransaction.save()
        } else {
          payment.meta = Object.assign({}, payment.meta || {}, { webhookPayload: payload })
          await payment.save()
        }
        log.verification = { ok: false, reason: 'not paid', payloadStatus: paymentStatus }
        await log.save()
      }
    } catch (err) {
      console.error('monnifyWebhook error', err)
      try { log.verification = { error: err.message }; await log.save() } catch (e) {}
    }
  })()
}

// POST /api/webhooks/paystack
exports.paystackWebhook = async (req, res) => {
  const signature = req.headers['x-paystack-signature']
  const payload = req.body

  const log = await WebhookLog.create({ payload, provider: 'paystack', method: req.method, path: req.originalUrl })
  res.status(200).send('OK')

  ;(async () => {
    try {
      const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
        .update(JSON.stringify(payload))
        .digest('hex')

      if (!signature || hash !== signature) {
        log.verification = { ok: false, reason: 'invalid signature' }
        await log.save()
        return
      }

      const event = payload.event || payload.type
      const data = payload.data || {}
      const paymentReference = data.reference || data.transaction && data.transaction.reference
      const paymentStatus = (data.status || data.payment_status || '').toLowerCase()

      if (!paymentReference) {
        log.verification = { ok: false, reason: 'no reference in payload' }
        await log.save()
        return
      }

      const payment = await Payment.findOne({ reference: paymentReference })
      let isWalletFunding = false
      let walletTransaction = null

      if (!payment) {
        // Check if it's a wallet funding transaction
        const Transaction = require('../models/transaction')
        walletTransaction = await Transaction.findOne({ reference: paymentReference, 'meta.type': 'wallet_funding' })
        if (walletTransaction) {
          isWalletFunding = true
        } else {
          log.verification = { ok: false, reason: 'payment not found' }
          await log.save()
          return
        }
      }

      if (event === 'charge.success' || paymentStatus === 'success' || String(paymentStatus).includes('success')) {
        if (isWalletFunding) {
          // Handle wallet funding
          const Wallet = require('../models/wallet')
          let wallet = await Wallet.findOne({ user: walletTransaction.user })
          if (!wallet) {
            wallet = await Wallet.create({ user: walletTransaction.user })
          }

          await wallet.credit(walletTransaction.amount, 'Wallet funding via Paystack', paymentReference, {
            paystack_reference: data.reference,
            paystack_transaction_id: data.id,
            webhook_payload: payload
          })

          // Update transaction
          walletTransaction.status = 'successful'
          walletTransaction.meta.paystack_data = data
          await walletTransaction.save()

          // Update user balance for backward compatibility
          await User.findByIdAndUpdate(walletTransaction.user, {
            $inc: { balance: walletTransaction.amount }
          })

          log.verification = { ok: true, walletFunding: true, user: walletTransaction.user }
          await log.save()

          // Notify user about successful funding
          try {
            const user = await User.findById(walletTransaction.user)
            if (user) {
              const title = 'Wallet Funded Successfully'
              const message = `Your wallet has been credited with ₦${walletTransaction.amount}`
              await Notification.create({ user: user._id, title, message, meta: { transaction: walletTransaction._id } })
            }
          } catch (e) {
            console.warn('wallet funding notification failed', e && e.message)
          }

        } else {
          // Handle regular payment
          payment.status = 'successful'
          payment.meta = Object.assign({}, payment.meta || {}, { webhookPayload: payload })
          await payment.save()

          // If this payment is tied to an approval, mark approval as paid.
          // Admin will create the actual UserTask(s) from the paid approval.
          if (payment.approval) {
            try {
              const TaskApproval = require('../models/taskApproval')
              const approval = await TaskApproval.findById(payment.approval)
              if (approval) {
                approval.paid = true
                await approval.save()

                // link payment to approval (leave task creation to admin)
                payment.meta = Object.assign({}, payment.meta || {}, { approvalHandled: true })
                await payment.save()
              }
            } catch (e) {
              console.warn('webhook: approval handling error', e && e.message)
            }
          } else {
            if (payment.task) {
              await UserTask.findByIdAndUpdate(payment.task, { paid: true, status: 'active' })
            }
          }

          try {
            const Transaction = require('../models/transaction')
            const tx = await Transaction.findOne({ reference: payment.reference })
            if (tx) {
              tx.status = 'successful'
              await tx.save()
            }
          } catch (e) {
            console.warn('webhook: could not update transaction', e.message || e)
          }

          log.verification = { ok: true, matchedPayment: payment._id }
          log.task = payment.task
          await log.save()
          // Notify admins about the successful payment
          try {
            const admins = await User.find({ role: 'admin' }).lean()
            const title = 'Payment Received'
            const message = `Payment ${paymentReference} of ${payment?.amount || walletTransaction?.amount} ${payment?.currency || 'NGN'} received.`
            for (const a of admins) {
              try {
                await Notification.create({ user: a._id, title, message, meta: { payment: payment?._id, walletTransaction: walletTransaction?._id } })
                if (a.email) {
                  transporter.sendMail({ from: process.env.SENDER_EMAIL, to: a.email, subject: title, text: message }).catch(() => {})
                }
              } catch (e) { console.warn('notify admin failed', e && e.message) }
            }
          } catch (e) { console.warn('webhook: admin notify failed', e && e.message) }
        }
      } else {
        if (isWalletFunding) {
          walletTransaction.status = 'failed'
          walletTransaction.meta.paystack_data = data
          await walletTransaction.save()
        } else {
          payment.meta = Object.assign({}, payment.meta || {}, { webhookPayload: payload })
          await payment.save()
        }
        log.verification = { ok: false, reason: 'not paid', payloadStatus: paymentStatus }
        await log.save()
      }
    } catch (err) {
      console.error('paystackWebhook error', err)
      try { log.verification = { error: err.message }; await log.save() } catch (e) {}
    }
  })()
}

// POST /api/webhooks/flutterwave
exports.flutterwaveWebhook = async (req, res) => {
  const payload = req.body
  const log = await WebhookLog.create({ payload, provider: 'flutterwave', method: req.method, path: req.originalUrl })
  res.status(200).send('OK')

  ;(async () => {
    // Verify Flutterwave signature (HMAC-SHA256 of raw JSON using FLW_SECRET_HASH)
    try {
      const signature = req.headers['verif-hash'] || req.headers['x-flw-signature'] || req.headers['verif_hash']
      const secret = process.env.FLW_SECRET_HASH || process.env.FLW_SECRET_KEY || ''
      if (!signature || !secret) {
        log.verification = { ok: false, reason: 'missing signature or server secret' }
        await log.save()
        return
      }

      const computed = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')
      if (computed !== String(signature)) {
        log.verification = { ok: false, reason: 'invalid signature' }
        await log.save()
        return
      }
    } catch (e) {
      // if signature verification throws, record and stop processing
      try { log.verification = { ok: false, reason: 'signature verification error', error: e.message }; await log.save() } catch (ee) {}
      return
    }
    try {
      // payload may contain data: { id, tx_ref, status, status_message }
      const data = payload.data || payload
      const paymentReference = data.tx_ref || data.txref || data.flw_ref || (data.data && (data.data.tx_ref || data.data.txref))
      const paymentStatus = (data.status || data.event || '').toLowerCase()

      if (!paymentReference) {
        log.verification = { ok: false, reason: 'no reference in payload' }
        await log.save()
        return
      }

      const payment = await Payment.findOne({ reference: paymentReference })
      if (!payment) {
        log.verification = { ok: false, reason: 'payment not found' }
        await log.save()
        return
      }

      if (String(paymentStatus).includes('successful') || String(paymentStatus).includes('success')) {
        payment.status = 'successful'
        payment.meta = Object.assign({}, payment.meta || {}, { webhookPayload: payload })
        await payment.save()

        if (payment.approval) {
          try {
            const TaskApproval = require('../models/taskApproval')
            const approval = await TaskApproval.findById(payment.approval)
            if (approval) { approval.paid = true; await approval.save(); payment.meta = Object.assign({}, payment.meta || {}, { approvalHandled: true }); await payment.save() }
          } catch (e) { console.warn('webhook: approval handling error', e && e.message) }
        } else {
          if (payment.task) await UserTask.findByIdAndUpdate(payment.task, { paid: true, status: 'active' })
        }

        try {
          const Transaction = require('../models/transaction')
          const tx = await Transaction.findOne({ reference: payment.reference })
          if (tx) { tx.status = 'successful'; await tx.save() }
        } catch (e) { console.warn('webhook: could not update transaction', e.message || e) }

        log.verification = { ok: true, matchedPayment: payment._id }
        log.task = payment.task
        await log.save()

        // Notify admins
        try {
          const admins = await User.find({ role: 'admin' }).lean()
          const title = 'Payment Received'
          const message = `Payment ${payment.reference} of ${payment.amount} ${payment.currency} received via Flutterwave.`
          for (const a of admins) {
            try {
              await Notification.create({ user: a._id, title, message, meta: { payment: payment._id } })
              if (a.email) transporter.sendMail({ from: process.env.SENDER_EMAIL, to: a.email, subject: title, text: message }).catch(() => {})
            } catch (e) { console.warn('notify admin failed', e && e.message) }
          }
        } catch (e) { console.warn('webhook: admin notify failed', e && e.message) }
      } else {
        payment.meta = Object.assign({}, payment.meta || {}, { webhookPayload: payload })
        await payment.save()
        log.verification = { ok: false, reason: 'not paid', payloadStatus: paymentStatus }
        await log.save()
      }
    } catch (err) {
      console.error('flutterwaveWebhook error', err)
      try { log.verification = { error: err.message }; await log.save() } catch (e) {}
    }
  })()
}


