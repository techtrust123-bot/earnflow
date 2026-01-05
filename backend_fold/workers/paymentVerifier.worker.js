const UserTask = require('../models/userTask')
const monnify = require('../services/paystack')

let isRunning = false

async function checkPendingPayments() {
  if (isRunning) return
  isRunning = true
  try {
    const pending = await UserTask.find({
      status: 'pending',
      $or: [ { paymentReference: { $exists: true, $ne: '' } }, { providerReference: { $exists: true, $ne: '' } } ]
    })
    if (!pending || pending.length === 0) {
      isRunning = false
      return
    }

    console.log(`PaymentVerifier: found ${pending.length} pending payments`)

    for (const task of pending) {
      try {
        const verifyRef = task.providerReference || task.paymentReference
        const verification = await monnify.verifyTransaction(verifyRef)
        task.paymentResponse = verification || {}

        // Do NOT auto-activate tasks here. Webhook is the source of truth.
        await task.save()
        const requestSuccessful = verification && verification.requestSuccessful
        const body = verification && (verification.responseBody || verification)
        const txStatus = body && (body.transactionStatus || body.status || body.paymentStatus || body.transactionResponse || body.transaction_status)
        const ok = requestSuccessful || (String(txStatus || '').toLowerCase().includes('success')) || (String(txStatus || '').toLowerCase().includes('paid'))
        if (ok) {
          console.log(`PaymentVerifier: task ${task._id} VERIFIED by provider (not auto-activated).`) 
        } else {
          console.log(`PaymentVerifier: task ${task._id} still pending`)          
        }
      } catch (err) {
        console.error('PaymentVerifier: error checking task', task._id, err.message || err)
      }
    }
  } catch (err) {
    console.error('PaymentVerifier: fatal error', err.message || err)
  } finally {
    isRunning = false
  }
}

// Start polling every 60 seconds
function startPaymentVerifier(intervalMs = 60 * 1000) {
  // Run immediately then at interval
  checkPendingPayments().catch(err => console.error('PaymentVerifier start error', err))
  setInterval(() => checkPendingPayments().catch(err => console.error('PaymentVerifier interval error', err)), intervalMs)
}

module.exports = { startPaymentVerifier }
