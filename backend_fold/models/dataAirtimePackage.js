const mongoose = require('mongoose')

const packageSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['data', 'airtime'], required: true },
  provider: { type: String, required: true }, // MTN, Airtel, Glo, etc.
  amount: Number,
  balance: Number, // MB for data, naira for airtime
  description: String,
  icon: String,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('DataAirtimePackage', packageSchema)
