const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'UserTask', required: true },
  reference: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'successful', 'failed'], default: 'pending' },
  method: { type: String },
  transactionHash: { type: String },
  paidOn: { type: Date }
}, { timestamps: true })

module.exports = mongoose.model('Payment', paymentSchema)