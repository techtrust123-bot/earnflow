const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  type: { type: String, enum: ['credit','debit'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['pending','successful','failed'], default: 'pending' },
  reference: { type: String, index: true },
  related: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedModel' },
  relatedModel: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true })

module.exports = mongoose.model('Transaction', transactionSchema)
