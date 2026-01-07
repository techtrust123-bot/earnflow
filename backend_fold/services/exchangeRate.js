
const axios = require('axios')

/**
 * PRODUCTION-SAFE exchangeRate service (USD -> NGN)
 * - Admin override via `USD_NGN_RATE`
 * - Timeouted API calls
 * - In-memory cache with TTL
 * - Background refresh (optional)
 * - Hard fallback rate
 */

const DEFAULT_TTL = 3600 // seconds
const TTL = Number(process.env.EXCHANGE_RATE_TTL_SECONDS || DEFAULT_TTL)
const HARD_FALLBACK_RATE = Number(process.env.HARD_FALLBACK_RATE || 1500)

const http = axios.create({ timeout: 5000 })

let cache = { rate: null, ts: 0 }

async function fetchRateFromAPI() {
  const res = await http.get('https://api.exchangerate.host/latest', { params: { base: 'USD', symbols: 'NGN' } })
  const rate = res?.data?.rates?.NGN
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid API exchange rate')
  cache.rate = rate
  cache.ts = Date.now()
  return rate
}

async function getRate() {
  // 1. Admin override (DB first, then env)
  try {
    const Setting = require('../models/setting')
    const doc = await Setting.findOne({ key: 'USD_NGN_RATE' }).lean()
    if (doc && doc.value) {
      const val = parseFloat(doc.value)
      if (!isNaN(val) && val > 0) return val
    }
  } catch (e) {
    // ignore DB errors and fall back to env or cache
    console.warn('exchangeRate: could not read DB override', e && e.message)
  }

  const override = parseFloat(process.env.USD_NGN_RATE)
  if (!isNaN(override) && override > 0) return override

  // 2. Cached value
  if (cache.rate && (Date.now() - cache.ts) < TTL * 1000) return cache.rate

  // 3. External API
  try {
    const rate = await fetchRateFromAPI()
    return rate
  } catch (err) {
    // silent fail; fall through
  }

  // 4. Stale cache
  if (cache.rate) return cache.rate

  // 5. Hard fallback
  return HARD_FALLBACK_RATE
}

async function usdToNgn(usdAmount) {
  if (typeof usdAmount !== 'number' || usdAmount < 0) throw new Error('Invalid USD amount')
  const rate = await getRate()
  return Math.round(usdAmount * rate)
}

async function ngnToUsd(ngnAmount) {
  if (typeof ngnAmount !== 'number' || ngnAmount < 0) throw new Error('Invalid NGN amount')
  const rate = await getRate()
  return Number((ngnAmount / rate).toFixed(2))
}

if (process.env.EXCHANGE_RATE_BG_REFRESH !== 'false') {
  fetchRateFromAPI().catch(() => {})
  setInterval(() => fetchRateFromAPI().catch(() => {}), Math.max(60000, TTL * 1000))
}

function setCachedRate(rate) {
  if (typeof rate === 'number' && rate > 0) {
    cache.rate = rate
    cache.ts = Date.now()
    console.info('exchangeRate: cached admin override rate set', rate)
    return true
  }
  return false
}

function clearCachedRate() {
  cache.rate = null
  cache.ts = 0
  console.info('exchangeRate: cache cleared')
}

module.exports = { getRate, usdToNgn, ngnToUsd, setCachedRate, clearCachedRate }
