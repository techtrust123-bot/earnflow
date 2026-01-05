const axios = require('axios')

const BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'
const paystack = axios.create({ baseURL: BASE_URL })

const secret = process.env.PAYSTACK_SECRET_KEY || ''

// Verify a Nigerian bank account (resolve account name)
exports.verifyAccount = async (accountNumber, bankCode) => {
  try {
    const res = await paystack.get('/bank/resolve', {
      params: { account_number: accountNumber, bank_code: bankCode },
      headers: { Authorization: `Bearer ${secret}` }
    })

    if (!res.data || !res.data.status) return { requestSuccessful: false, responseMessage: 'Provider error' }

    return {
      requestSuccessful: true,
      responseBody: { accountName: res.data.data.account_name }
    }
  } catch (err) {
    const body = err.response && err.response.data
    return { requestSuccessful: false, responseMessage: body?.message || err.message }
  }
}

// Initiate a single transfer. This creates a recipient (if needed) then initiates transfer.
exports.initiateTransfer = async ({ amount, accountNumber, bankCode, accountName, reference }) => {
  try {
    // create recipient
    const recipientRes = await paystack.post('/transferrecipient', {
      type: 'nuban',
      name: accountName || 'Recipient',
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN'
    }, { headers: { Authorization: `Bearer ${secret}` } })

    const recipient = recipientRes.data && recipientRes.data.data

    // Paystack expects amount in kobo
    const amt = Math.round(Number(amount) * 100)

    const transferRes = await paystack.post('/transfer', {
      source: 'balance',
      amount: amt,
      recipient: recipient.recipient_code,
      reason: 'Withdrawal',
      reference
    }, { headers: { Authorization: `Bearer ${secret}` } })

    const data = transferRes.data && transferRes.data.data
    return { requestSuccessful: true, responseBody: data }
  } catch (err) {
    const body = err.response && err.response.data
    return { requestSuccessful: false, responseMessage: body?.message || err.message, responseBody: body }
  }
}

// Initialize a payment session (return parameters frontend can use)
exports.createPaymentSession = async ({ amount, currency = 'NGN', customerName, customerEmail, paymentReference }) => {
  // Paystack frontend requires public key and reference. Backend can return values for client.
  return {
    amount,
    currency,
    customerName,
    customerEmail,
    reference: paymentReference,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY
  }
}

// Verify a transaction by reference
exports.verifyTransaction = async (paymentReference) => {
  try {
    const res = await paystack.get(`/transaction/verify/${encodeURIComponent(paymentReference)}`, {
      headers: { Authorization: `Bearer ${secret}` }
    })
    const body = res.data
    if (body && body.status) return { requestSuccessful: true, responseBody: body.data }
    return { requestSuccessful: false, responseMessage: 'Not found' }
  } catch (err) {
    const body = err.response && err.response.data
    if (body && body.status === false) return { requestSuccessful: false, responseMessage: body.message, notFound: true }
    throw err
  }
}

// Reserve virtual account (not implemented for Paystack here)
exports.reserveVirtualAccount = async () => {
  throw new Error('reserveVirtualAccount not implemented for Paystack')
}
