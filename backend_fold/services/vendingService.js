const mongoose = require('mongoose');
const Wallet = require('../models/wallet');
const WalletHold = require('../models/walletHold');
const VendingTransaction = require('../models/vendingTransaction');
const AuditLog = require('../models/auditLog');

/**
 * Initiate a vend by holding funds and creating a vending transaction stub.
 * transactionId is used for idempotency.
 */
async function initiateVend({ userId, provider, amount, phone, plan, transactionId }) {
  if (!transactionId) throw new Error('transactionId required');
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.balance < amount) throw new Error('Insufficient balance');

    // create hold
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 min hold by default
    const hold = await WalletHold.create([{
      wallet: wallet._id,
      amount,
      purpose: provider ? 'data' : 'other',
      provider,
      transactionId,
      metadata: { phone, plan },
      expiresAt
    }], { session });

    // adjust wallet
    wallet.balance -= amount;
    wallet.locked = (wallet.locked || 0) + amount;
    await wallet.save({ session });

    // create vending transaction stub
    const vend = await VendingTransaction.create([{
      hold: hold[0]._id,
      status: 'initiated'
    }], { session });

    await AuditLog.log(userId, 'vending_initiated', { provider, amount, phone, plan, transactionId }, null);
    await session.commitTransaction();
    return { hold: hold[0], vending: vend[0] };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// processing after provider response
async function recordProviderResponse(vendId, response) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const vend = await VendingTransaction.findById(vendId).session(session);
    if (!vend) throw new Error('Vending transaction not found');
    vend.attempts = (vend.attempts || 0) + 1;
    vend.lastAttemptAt = new Date();
    vend.providerResponse = response;

    // determine status
    if (response.success) {
      vend.status = 'success';
      vend.providerReference = response.reference;
      // capture the hold
      await WalletHold.captureHold(vend.hold, session);
      await AuditLog.log(null, 'vending_succeeded', { vendId, providerReference: response.reference }, null);
    } else {
      vend.status = 'failed';
      vend.errorCode = response.errorCode || 'provider_failure';
      await AuditLog.log(null, 'vending_failed', { vendId, error: response.errorCode }, null);
      // auto refund the hold
      await WalletHold.refundHold(vend.hold, session, 'provider failure');
    }
    await vend.save({ session });
    await session.commitTransaction();
    return vend;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = {
  initiateVend,
  recordProviderResponse
};