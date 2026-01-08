const axios = require('axios')

const BASE_URL = process.env.FLW_BASE_URL || 'https://api.flutterwave.com/v3'
const flw = axios.create({ baseURL: BASE_URL, timeout: 8000 })

const secret = process.env.FLW_SECRET_KEY || ''

// Initialize a Flutterwave payment (server-side)
exports.initializeTransaction = async ({ email, amount, currency = 'USD', reference, callback_url, customerName }) => {
  try {
    const body = {
      tx_ref: reference,
      amount: String(amount),
      currency,
      redirect_url: callback_url || process.env.FLW_CALLBACK_URL || '',
      customer: { email, name: customerName || '' }
    }

    const res = await flw.post('/payments', body, { headers: { Authorization: `Bearer ${secret}` } })
    const resp = res.data || {}

    // Flutterwave returns data.link for the hosted checkout URL
    const data = resp.data || {}
    const link = data.link || data.checkout_url || null
    if (resp.status === 'success' || link) {
      return { requestSuccessful: true, responseBody: { authorization_url: link, reference: data.flw_ref || data.tx_ref || reference, raw: data } }
    }

    return { requestSuccessful: false, responseMessage: resp?.message || 'Init failed', responseBody: data }
  } catch (err) {
    const body = err.response && err.response.data
    return { requestSuccessful: false, responseMessage: body?.message || err.message, responseBody: body }
  }
}
