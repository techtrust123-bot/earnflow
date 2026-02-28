const mongoose = require('mongoose')

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'earn-users',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCredited: {
    type: Number,
    default: 0
  },
  totalDebited: {
    type: Number,
    default: 0
  },
  lastTransaction: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

// Index for performance

// Method to credit wallet
walletSchema.methods.credit = function(amount, description, reference, meta = {}) {
  this.balance += amount
  this.totalCredited += amount
  this.lastTransaction = new Date()
  return this.save()
}

// Method to debit wallet
walletSchema.methods.debit = function(amount, description, reference, meta = {}) {
  if (this.balance < amount) {
    throw new Error('Insufficient balance')
  }
  this.balance -= amount
  this.totalDebited += amount
  this.lastTransaction = new Date()
  return this.save()
}

module.exports = mongoose.model('Wallet', walletSchema)