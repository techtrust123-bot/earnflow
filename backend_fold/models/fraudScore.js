const mongoose = require('mongoose');

const fraudScoreSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  score: { type: Number, min: 0, max: 100, default: 0 },
  factors: mongoose.Schema.Types.Mixed,
  flagged: { type: Boolean, default: false },
  vendCount: { type: Number, default: 0 },
  refundRate: { type: Number, default: 0 },
  lastVendAt: Date,
  blockedUntil: Date
}, { timestamps: true });

fraudScoreSchema.statics.updateScore = async function(userId, vendAmount) {
  let score = 0;
  const factors = {};

  const user = await mongoose.model('User').findById(userId);
  if (!user) return { score: 0, factors };

  // Velocity check: N vends in last hour
  const oneHourAgo = new Date(Date.now() - 3600000);
  const VendingTransaction = mongoose.model('VendingTransaction');
  const recentVends = await VendingTransaction.countDocuments({
    createdAt: { $gte: oneHourAgo }
  });

  if (recentVends > 5) {
    score += 30;
    factors.highVelocity = true;
  }

  // Refund rate: if user's refund ratio is high
  const userVends = await VendingTransaction.find({ 'hold.wallet': user.wallet });
  const failedVends = userVends.filter(v => v.status === 'failed').length;
  const refundRate = userVends.length > 0 ? failedVends / userVends.length : 0;

  if (refundRate > 0.3) {
    score += 25;
    factors.highRefundRate = refundRate;
  }

  // Amount check: unusually large purchase
  if (vendAmount > 100000) {
    score += 15;
    factors.largeAmount = true;
  }

  // New device? (if device fingerprint service used)
  if (user.devices && user.devices.length === 0) {
    score += 10;
    factors.newDevice = true;
  }

  await this.updateOne({ user: userId }, { score, factors }, { upsert: true });
  return { score, factors };
};

module.exports = mongoose.model('FraudScore', fraudScoreSchema);
