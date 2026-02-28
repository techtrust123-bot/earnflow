const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'earn-users',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  accountNumber: {
    type: String,
    required: true
  },
  bankCode: {
    type: String,
    required: true
  },
  accountName: String,
  status: {
    type: String,
    enum: ['pending_review', 'approved', 'denied', 'completed', 'failed'],
    default: 'pending_review',
    index: true
  },
  reason: String,  // Why it requires review
  riskScore: Number,
  riskFactors: [String],
  reviewedBy: mongoose.Schema.Types.ObjectId,
  reviewedAt: Date,
  reviewNotes: String,
  decisionReason: String,
  reference: {
    type: String,
    index: true,
    unique: true,
    sparse: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: Date
}, { timestamps: true });

// Index for admin dashboard queries
withdrawalRequestSchema.index({ status: 1, createdAt: -1 });
withdrawalRequestSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
