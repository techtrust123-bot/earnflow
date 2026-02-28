const mongoose = require('mongoose');
const VendingTransaction = require('../models/vendingTransaction');
const WalletTransaction = require('../models/walletTransaction');

/**
 * Generate a daily financial report snapshot
 */
async function generateDailyReport(dateStr) {
  try {
    const dayStart = new Date(dateStr); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr); dayEnd.setHours(23, 59, 59, 999);

    // aggregation queries for daily report
    const vendingAgg = await VendingTransaction.aggregate([
      { $match: { createdAt: { $gte: dayStart, $lte: dayEnd }, status: 'success' } },
      { $group: {
        _id: null,
        count: { $sum: 1 },
        totalAmount: { $sum: { $ifNull: ['$hold.amount', 0] } }
      } }
    ]);

    const refundedAgg = await VendingTransaction.aggregate([
      { $match: { createdAt: { $gte: dayStart, $lte: dayEnd }, status: 'failed' } },
      { $group: {
        _id: null,
        count: { $sum: 1 },
        totalAmount: { $sum: { $ifNull: ['$hold.amount', 0] } }
      } }
    ]);

    return {
      period: dateStr,
      totalVended: vendingAgg[0]?.totalAmount || 0,
      totalRefunded: refundedAgg[0]?.totalAmount || 0,
      vends: vendingAgg[0]?.count || 0,
      refunds: refundedAgg[0]?.count || 0
    };
  } catch (err) {
    console.error('Daily report generation error:', err.message);
    throw err;
  }
}

/**
 * Reconcile provider reports against our transaction records
 */
async function reconcileProvider(provider, reportData) {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    // compare provider records with our vending transactions
    const discrepancies = [];
    for (const provRecord of reportData) {
      const vendTx = await VendingTransaction.findOne({
        providerReference: provRecord.reference
      }).session(session);

      if (!vendTx) {
        discrepancies.push({
          type: 'missing_txn',
          providerRef: provRecord.reference,
          amount: provRecord.amount
        });
      } else if (vendTx.status !== 'success' && provRecord.status === 'success') {
        // provider says success but we don't - flag for investigation
        discrepancies.push({
          type: 'status_mismatch',
          vendId: vendTx._id,
          providerRef: provRecord.reference
        });
      }
    }

    await session.commitTransaction();
    return { provider, processedAt: new Date(), discrepancies };
  } catch (err) {
    console.error('Provider reconciliation error:', err.message);
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = {
  generateDailyReport,
  reconcileProvider
};