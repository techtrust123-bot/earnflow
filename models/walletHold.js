const mongoose = require('mongoose');

const walletHoldSchema = new mongoose.Schema({
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },
  // for backward compatibility we keep the original transaction link
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WalletTransaction',
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  // generic fields useful for vending/airtime
  purpose: {
    type: String,
    enum: ['withdrawal', 'data', 'airtime', 'other'],
    default: 'other',
    index: true
  },
  provider: String,            // e.g. 'MTN', 'Airtel' for vending
  transactionId: {             // idempotency key supplied by caller
    type: String,
    index: true,
    unique: true,
    sparse: true
  },
  metadata: mongoose.Schema.Types.Mixed,

  reason: String,
  status: {
    type: String,
    enum: ['active', 'captured', 'released', 'refunded', 'forfeited'],
    default: 'active',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  releasedAt: Date,
  releaseReason: String
}, { timestamps: true });

// Statics to handle expired holds and basic operations
walletHoldSchema.statics.releaseExpiredHolds = async function() {
  const Wallet = mongoose.model('Wallet');
  const expiredHolds = await this.find({
    status: 'active',
    expiresAt: { $lt: new Date() }
  }).populate('wallet');
  
  for (const hold of expiredHolds) {
    try {
      const wallet = hold.wallet;
      if (wallet) {
        wallet.balance += hold.amount;
        await wallet.save();
      }
      
      hold.status = 'released';
      hold.releasedAt = new Date();
      hold.releaseReason = 'Expired hold auto-release';
      await hold.save();
    } catch (err) {
      console.error('Failed to release hold:', err.message);
    }
  }
};

// Capture an active hold (e.g. after vendor confirms)
walletHoldSchema.statics.captureHold = async function(holdId, session) {
  const hold = await this.findOne({ _id: holdId, status: 'active' }).session(session);
  if (!hold) throw new Error('Hold not found or already processed');
  const Wallet = mongoose.model('Wallet');
  const wallet = await Wallet.findById(hold.wallet).session(session);
  if (!wallet) throw new Error('Associated wallet missing');

  // move locked funds to spent/captured
  wallet.locked = (wallet.locked || 0) - hold.amount;
  wallet.spent = (wallet.spent || 0) + hold.amount;
  await wallet.save({ session });

  hold.status = 'captured';
  hold.updatedAt = new Date();
  await hold.save({ session });
  return hold;
};

// Refund an active hold back to wallet balance
walletHoldSchema.statics.refundHold = async function(holdId, session, reason = 'refund') {
  const hold = await this.findOne({ _id: holdId, status: 'active' }).session(session);
  if (!hold) throw new Error('Hold not found or already processed');
  const Wallet = mongoose.model('Wallet');
  const wallet = await Wallet.findById(hold.wallet).session(session);
  if (!wallet) throw new Error('Associated wallet missing');

  wallet.locked = (wallet.locked || 0) - hold.amount;
  wallet.balance += hold.amount;
  await wallet.save({ session });

  hold.status = 'refunded';
  hold.releaseReason = reason;
  hold.releasedAt = new Date();
  await hold.save({ session });
  return hold;
};

module.exports = mongoose.model('WalletHold', walletHoldSchema);
