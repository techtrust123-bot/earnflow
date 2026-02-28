const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'earn-users',
    required: true,
    index: true
  },
  fingerprint: String,  // JSON string of device fingerprint
  fingerprintHash: {
    type: String,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  lastUsed: {
    type: Date,
    index: true
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  trustStatus: {
    type: String,
    enum: ['trusted', 'suspicious', 'blocked'],
    default: 'suspicious',
    index: true
  },
  verificationCode: String,
  verificationCodeExpires: Date,
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvedAt: Date,
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// Compound index for finding user's devices
deviceSchema.index({ user: 1, fingerprintHash: 1 });
deviceSchema.index({ user: 1, lastUsed: -1 });

module.exports = mongoose.model('Device', deviceSchema);
