const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'earn-users', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'UserTask' },
  approval: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskApproval' },
  reference: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['NGN','USD'], default: 'NGN' },
  status: { type: String, enum: ['pending', 'successful', 'failed'], default: 'pending' },
  method: { type: String },
  transactionHash: { type: String },
  paidOn: { type: Date }
}, { timestamps: true })

module.exports = mongoose.model('Payment', paymentSchema)