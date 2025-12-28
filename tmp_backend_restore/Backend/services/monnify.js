const axios = require("../../../backend_fold/node_modules/axios")

let accessToken = null
let tokenExpiry = null

const BASE_URL = (process.env.MONNIFY_BASE_URL || '').replace(/\/$/, '') + '/api'
const monnify = axios.create({
  baseURL: BASE_URL
})

/**
 * Get access token
 */
const authenticate = async () => {
  if (accessToken && tokenExpiry > Date.now()) return accessToken

  const auth = Buffer.from(
    `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`
  ).toString("base64")

  try {
    const res = await monnify.post('/v1/auth/login', {}, { headers: { Authorization: `Basic ${auth}` } })
    accessToken = res.data.responseBody && res.data.responseBody.accessToken
    tokenExpiry = Date.now() + (res.data.responseBody?.expiresIn || 0) * 1000
    return accessToken
  } catch (err) {
    console.error('Monnify authenticate error', err.response?.status, err.response?.data || err.message)
    throw err
  }
}

/**
 * Verify bank account
 */
exports.verifyAccount = async (accountNumber, bankCode) => {
  const token = await authenticate()

  const res = await monnify.get("/v1/disbursements/account/validate", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      accountNumber,
      bankCode
    }
  })

  return res.data
}

/**
 * Initiate transfer
 */
exports.initiateTransfer = async ({
  amount,
  accountNumber,
  bankCode,
  accountName,
  reference
}) => {
  const token = await authenticate()

  const res = await monnify.post(
    "/v2/disbursements/single",
    {
      amount,
      reference,
      narration: "Withdrawal",
      destinationBankCode: bankCode,
      destinationAccountNumber: accountNumber,
      destinationAccountName: accountName,
      currency: "NGN",
      sourceAccountNumber: process.env.MONNIFY_CONTRACT_CODE
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )

  return res.data
}

/**
 * Create a payment session (initialize transaction)
 * Note: endpoint path may vary depending on Monnify API version and account.
 */
exports.createPaymentSession = async ({ amount, currency = 'NGN', customerName, customerEmail, paymentReference, returnUrl = '', paymentMethods = null }) => {
  const token = await authenticate()

  const body = {
    amount,
    currency,
    customerName,
    customerEmail,
    paymentReference,
    contractCode: process.env.MONNIFY_CONTRACT_CODE,
    redirectUrl: returnUrl
  }

  // Allow caller to request specific payment methods (CARD, ACCOUNT_TRANSFER, USSD, etc.)
  if (paymentMethods && Array.isArray(paymentMethods) && paymentMethods.length > 0) {
    body.paymentMethods = paymentMethods
  }

  // Try a few known init endpoints depending on account/API version
  const candidates = [
    '/v2/transactions/init-transaction',
    '/v2/transactions/initialize',
    '/v1/transactions/init-transaction',
    '/v1/transactions/initialize'
  ]

  let lastErr
  for (const path of candidates) {
    try {
      const res = await monnify.post(path, body, { headers: { Authorization: `Bearer ${token}` } })
      return res.data.responseBody || res.data
    } catch (err) {
      lastErr = err
      // If we got a 405/99-type response from provider, keep trying alternate paths
      // but if auth error, surface immediately
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        throw err
      }
      // otherwise continue to next candidate
    }
  }

  // If all attempts failed, throw last error so caller can inspect provider response
  throw lastErr
}

/**
 * Verify a transaction by reference
 */
exports.verifyTransaction = async (paymentReference) => {
  const token = await authenticate()
  try {
    const res = await monnify.get(`/v2/transactions/${encodeURIComponent(paymentReference)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return res.data.responseBody || res.data
  } catch (err) {
    // If Monnify returns a 4xx (e.g., 404 not found), return the response body
    if (err.response) {
      const out = err.response.data || { requestSuccessful: false, responseMessage: err.message }
      // flag notFound for calling code to react differently
      if (err.response.status === 404) out.notFound = true
      return out
    }
    throw err
  }
}

/**
 * Reserve a virtual account for a payment (per-transaction virtual account)
 * Tries a few common endpoints depending on Monnify API version.
 */
exports.reserveVirtualAccount = async ({ accountReference, accountName, currency = 'NGN', preferredBanks = [] }) => {
  const token = await authenticate()

  const body = {
    contractCode: process.env.MONNIFY_CONTRACT_CODE,
    accountReference,
    accountName,
    currency
  }

  if (preferredBanks && Array.isArray(preferredBanks) && preferredBanks.length) {
    body.preferredBanks = preferredBanks
  }

  const candidates = [
    '/v2/virtual-accounts/reserve',
    '/v1/virtual-account-reservations',
    '/v2/virtual-account-reservations',
    '/v1/bank-transfer/reserved-accounts'
  ]

  let lastErr
  for (const path of candidates) {
    try {
      const res = await monnify.post(path, body, { headers: { Authorization: `Bearer ${token}` } })
      return res.data.responseBody || res.data
    } catch (err) {
      lastErr = err
      if (err.response && (err.response.status === 401 || err.response.status === 403)) throw err
      // otherwise try next candidate
    }
  }

  throw lastErr
}
