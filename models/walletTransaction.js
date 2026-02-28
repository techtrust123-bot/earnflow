const mongoose = require('mongoose');
const crypto = require('crypto');

const walletTransactionSchema = new mongoose.Schema({
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'hold', 'release'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'committed', 'reversed'],
    default: 'pending',
    index: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: String,
  reference: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  relatedModel: String,
  relatedId: mongoose.Schema.Types.ObjectId,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  reversalReason: String,
  reversedBy: mongoose.Schema.Types.ObjectId,
  reversedAt: Date,
  fraudFlags: [String],
  ipAddress: String,
  userAgent: String,
  commitmentHash: String,  // Hash proof of immutability
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  committedAt: Date
}, { timestamps: true });

// Before save - generate commitment hash when committed
walletTransactionSchema.pre('save', function(next) {
  if (this.status === 'committed' && !this.commitmentHash) {
    const originalDoc = {
      amount: this.amount,
      type: this.type,
      reference: this.reference,
      balanceBefore: this.balanceBefore,
      balanceAfter: this.balanceAfter
    };
    this.commitmentHash = crypto.createHash('sha256')
      .update(JSON.stringify(originalDoc))
      .digest('hex');
    this.committedAt = new Date();
  }
  next();
});

// Index for querying
walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
