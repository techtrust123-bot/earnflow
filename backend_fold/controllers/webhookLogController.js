const WebhookLog = require('../models/webhookLog')
const crypto = require('crypto')
const Payment = require('../models/payment')
const UserTask = require('../models/userTask')


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
      } else {
        payment.meta = Object.assign({}, payment.meta || {}, { webhookPayload: payload })
        await payment.save()
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
      if (!payment) {
        log.verification = { ok: false, reason: 'payment not found' }
        await log.save()
        return
      }

      if (event === 'charge.success' || paymentStatus === 'success' || String(paymentStatus).includes('success')) {
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
      } else {
        payment.meta = Object.assign({}, payment.meta || {}, { webhookPayload: payload })
        await payment.save()
        log.verification = { ok: false, reason: 'not paid', payloadStatus: paymentStatus }
        await log.save()
      }
    } catch (err) {
      console.error('paystackWebhook error', err)
      try { log.verification = { error: err.message }; await log.save() } catch (e) {}
    }
  })()
}


