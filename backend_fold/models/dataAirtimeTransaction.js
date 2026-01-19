const mongoose = require('mongoose')

const dataAirtimeTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  userEmail: String,
  type: { type: String, enum: ['data', 'airtime'], required: true },
  packageId: mongoose.Schema.Types.ObjectId,
  packageName: String,
  provider: String,
  amount: Number,
  balance: Number, // MB for data, naira for airtime
  phoneNumber: String,
  status: { 
    type: String, 
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionRef: String,
  previousBalance: Number,
  newBalance: Number,
  errorMessage: String,
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
})

dataAirtimeTransactionSchema.index({ userId: 1, createdAt: -1 })
dataAirtimeTransactionSchema.index({ transactionRef: 1 })

module.exports = mongoose.model('DataAirtimeTransaction', dataAirtimeTransactionSchema)
