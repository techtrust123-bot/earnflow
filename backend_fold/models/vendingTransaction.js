const mongoose = require('mongoose');

const vendingSchema = new mongoose.Schema({
  hold: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletHold', required: true, index: true },
  status: { type: String, enum: ['initiated','sent','success','failed'], required: true, index: true },
  providerResponse: mongoose.Schema.Types.Mixed,
  providerReference: String,
  attempts: { type: Number, default: 0 },
  lastAttemptAt: Date,
  errorCode: String
}, { timestamps: true });

module.exports = mongoose.model('VendingTransaction', vendingSchema);