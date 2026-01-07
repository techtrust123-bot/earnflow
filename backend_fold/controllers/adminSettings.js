const axios = require('axios')
const Setting = require('../models/setting')
const SettingAudit = require('../models/settingAudit')
const exchangeRate = require('../services/exchangeRate')

// GET /api/admin/settings/exchange-rate
exports.getExchangeRate = async (req, res) => {
  try {
    // prefer DB override
    const doc = await Setting.findOne({ key: 'USD_NGN_RATE' }).lean()
    if (doc && doc.value) return res.json({ success: true, rate: Number(doc.value), source: 'db', lastModifiedBy: doc.lastModifiedBy || null, lastModifiedAt: doc.lastModifiedAt || null })

    // fallback to env override
    const envVal = parseFloat(process.env.USD_NGN_RATE)
    if (!isNaN(envVal) && envVal > 0) return res.json({ success: true, rate: envVal, source: 'env' })

    return res.json({ success: true, rate: null, source: 'none' })
  } catch (err) {
    console.error('getExchangeRate error', err && err.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PUT /api/admin/settings/exchange-rate
exports.setExchangeRate = async (req, res) => {
  try {
    const { rate } = req.body
    if (rate === undefined || rate === null) return res.status(400).json({ success: false, message: 'Missing rate' })
    const num = Number(rate)
    if (isNaN(num) || num <= 0) return res.status(400).json({ success: false, message: 'Invalid rate' })

    const userId = req.user && (req.user._id || req.user.id)

    const prev = await Setting.findOne({ key: 'USD_NGN_RATE' }).lean()
    const doc = await Setting.findOneAndUpdate(
      { key: 'USD_NGN_RATE' },
      { value: String(num), lastModifiedBy: userId, lastModifiedAt: new Date() },
      { upsert: true, new: true }
    )

    // record audit
    try {
      await SettingAudit.create({ key: 'USD_NGN_RATE', oldValue: prev && prev.value ? String(prev.value) : null, newValue: String(num), changedBy: userId, changedAt: new Date(), note: 'Admin override set' })
    } catch (e) { console.warn('failed to write setting audit', e && e.message) }

    // update in-memory cache so change is immediate
    try { exchangeRate.setCachedRate(num) } catch (e) { console.warn('failed to set cached rate', e && e.message) }

    return res.json({ success: true, rate: Number(doc.value) })
  } catch (err) {
    console.error('setExchangeRate error', err && err.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE /api/admin/settings/exchange-rate  (clear override)
exports.clearExchangeRate = async (req, res) => {
  try {
    const prev = await Setting.findOne({ key: 'USD_NGN_RATE' }).lean()
    await Setting.deleteOne({ key: 'USD_NGN_RATE' })
    // audit
    try {
      await SettingAudit.create({ key: 'USD_NGN_RATE', oldValue: prev && prev.value ? String(prev.value) : null, newValue: null, changedBy: req.user && (req.user._id || req.user.id), changedAt: new Date(), note: 'Admin override cleared' })
    } catch (e) { console.warn('failed to write setting audit', e && e.message) }
    // clear in-memory cache so service falls back to API/env
    try { exchangeRate.clearCachedRate() } catch (e) { console.warn('failed to clear cached rate', e && e.message) }
    return res.json({ success: true })
  } catch (err) {
    console.error('clearExchangeRate error', err && err.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/admin/settings/exchange-rate/audit
exports.listExchangeRateAudits = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10))
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit || '25', 10)))
    const skip = (page - 1) * limit
    const docs = await SettingAudit.find({ key: 'USD_NGN_RATE' }).sort({ changedAt: -1 }).skip(skip).limit(limit).populate('changedBy', 'name email')
    const total = await SettingAudit.countDocuments({ key: 'USD_NGN_RATE' })
    return res.json({ success: true, audits: docs, page, totalPages: Math.ceil(total / limit), total })
  } catch (err) {
    console.error('listExchangeRateAudits error', err && err.message)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/admin/settings/exchange-rate/preview
exports.previewExternalRate = async (req, res) => {
  try {
    const rate = await exchangeRate.getExternalRate()
    return res.json({ success: true, rate, source: 'api' })
  } catch (err) {
    console.error('previewExternalRate error', err && err.message)
    return res.status(500).json({ success: false, message: 'Failed to fetch API rate' })
  }
}

// GET /api/admin/settings/exchange-rate/history
exports.previewExternalHistory = async (req, res) => {
  try {
    const days = Math.min(30, Math.max(1, parseInt(req.query.days || '7', 10)))
    const end = new Date()
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    const fmt = d => d.toISOString().slice(0, 10)
    const url = 'https://api.exchangerate.host/timeseries'
    const r = await axios.get(url, { params: { start_date: fmt(start), end_date: fmt(end), base: 'USD', symbols: 'NGN' }, timeout: 8000 })
    const ratesObj = r.data && r.data.rates
    const series = []
    if (ratesObj && typeof ratesObj === 'object') {
      Object.keys(ratesObj).sort().forEach(date => {
        const v = ratesObj[date] && ratesObj[date].NGN
        if (typeof v === 'number') series.push({ date, rate: v })
      })
    }
    return res.json({ success: true, series, days })
  } catch (err) {
    console.error('previewExternalHistory error', err && err.message)
    return res.status(500).json({ success: false, message: 'Failed to fetch rate history' })
  }
}
