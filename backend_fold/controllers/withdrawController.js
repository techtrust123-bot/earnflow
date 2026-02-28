const { initiateTransfer, verifyAccount } = require('../services/paystack');
const User = require('../models/user');
const Wallet = require('../models/wallet');
const Transaction = require('../models/transaction');
const WalletTransaction = require('../models/walletTransaction');
const WalletHold = require('../models/walletHold');
const WithdrawalRequest = require('../models/withdrawalRequest');
const AuditLog = require('../models/auditLog');
const fraudDetection = require('../services/fraudDetection');
const mongoose = require('mongoose');
const crypto = require('crypto');

exports.withdraw = async (req, res) => {
  const user = req.user;
  let { amount, accountNumber, accountName, bankCode, paymentMethod = 'balance', pin } = req.body;

  amount = Number(amount);

  // Security Check 1: Account Verification Required
  if (!user.isAccountVerify) {
    await AuditLog.log(user._id, 'withdrawal_failed', {
      reason: 'unverified_email',
      status: 'failure'
    }, req);
    
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before withdrawing',
      requiresVerification: true
    });
  }

  // Security Check 2: Transaction PIN Verification
  if (!user.transactionPinSet) {
    return res.status(400).json({
      success: false,
      message: 'Please set up transaction PIN first',
      setupLink: '/auth/set-pin'
    });
  }

  if (!pin) {
    return res.status(400).json({
      success: false,
      message: 'Transaction PIN required for withdrawals'
    });
  }

  try {
    const bcrypt = require('bcryptjs');
    const pinValid = await bcrypt.compare(pin, user.transactionPin);
    if (!pinValid) {
      await AuditLog.log(user._id, 'withdrawal_failed', {
        reason: 'invalid_pin',
        status: 'failure'
      }, req);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid transaction PIN'
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'PIN verification error' });
  }

  // Input Validation
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }

  if (amount < 500) {
    return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₦500' });
  }

  if (amount > 1000000) {
    return res.status(400).json({ success: false, message: 'Maximum withdrawal is ₦1,000,000' });
  }

  if (!/^[0-9]{10}$/.test(String(accountNumber))) {
    return res.status(400).json({ success: false, message: 'Invalid account number format' });
  }

  if (!bankCode) {
    return res.status(400).json({ success: false, message: 'Missing bank code' });
  }

  // Check daily withdrawal limit
  const today = new Date().toDateString();
  const userWithdrawalDate = user.withdrawalSettings?.lastWithdrawalDate?.toDateString?.();

  if (userWithdrawalDate !== today) {
    user.withdrawalSettings = user.withdrawalSettings || {};
    user.withdrawalSettings.totalWithdrawalsToday = 0;
    user.withdrawalSettings.lastWithdrawalDate = new Date();
  }

  const dailyTotal = (user.withdrawalSettings?.totalWithdrawalsToday || 0) + amount;
  const dailyLimit = user.withdrawalSettings?.dailyLimit || 50000;

  if (dailyTotal > dailyLimit) {
    return res.status(400).json({
      success: false,
      message: `Daily withdrawal limit exceeded. Limit: ₦${dailyLimit}, Already withdrawn today: ₦${user.withdrawalSettings.totalWithdrawalsToday}`,
      remainingToday: dailyLimit - user.withdrawalSettings.totalWithdrawalsToday
    });
  }

  // Security Check 3: Fraud Detection
  try {
    const fraudCheck = await fraudDetection.shouldBlockWithdrawal(user, amount);

    if (fraudCheck.blocked) {
      await AuditLog.log(user._id, 'withdrawal_failed', {
        reason: 'fraud_detected',
        fraudScore: fraudCheck.fraudScore,
        status: 'failure',
        severity: 'critical'
      }, req);

      return res.status(403).json({
        success: false,
        message: fraudCheck.reason,
        contactSupport: fraudCheck.contactSupport
      });
    }

    // If high risk, require manual review
    if (fraudCheck.requiresManualReview) {
      const reference = `WD-REVIEW-${Date.now()}-${user._id}`;
      
      const withdrawalRequest = new WithdrawalRequest({
        user: user._id,
        amount,
        accountNumber,
        bankCode,
        accountName: accountName || 'Pending verification',
        status: 'pending_review',
        reason: fraudCheck.reason || 'High risk detected',
        riskScore: fraudCheck.fraudScore,
        riskFactors: fraudCheck.indicators || [],
        reference,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      await withdrawalRequest.save();

      await AuditLog.log(user._id, 'withdrawal_attempt', {
        amount,
        status: 'pending_review',
        fraudScore: fraudCheck.fraudScore,
        reason: 'Manual verification required'
      }, req);

      return res.json({
        success: true,
        message: 'Your withdrawal is pending review. You will be notified within 2 hours.',
        requestId: withdrawalRequest._id,
        status: 'pending_review'
      });
    }
  } catch (fraudErr) {
    console.warn('Fraud detection error:', fraudErr);
    // Continue if fraud detection fails
  }

  // ATOMIC TRANSACTION STARTS HERE
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch and lock wallet/user
    let wallet = await Wallet.findOne({ user: user._id }).session(session);
    if (!wallet) {
      wallet = await Wallet.create([{ user: user._id }], { session });
      wallet = wallet[0];
    }

    // 2. Check balance inside transaction (prevents race conditions)
    let availableBalance = 0;
    if (paymentMethod === 'wallet') {
      availableBalance = wallet.balance;
    } else if (paymentMethod === 'balance') {
      const freshUser = await User.findById(user._id).session(session);
      availableBalance = freshUser.balance || 0;
    } else {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    if (availableBalance < amount) {
      await session.abortTransaction();
      session.endSession();
      
      await AuditLog.log(user._id, 'withdrawal_failed', {
        reason: 'insufficient_balance',
        available: availableBalance,
        requested: amount,
        status: 'failure'
      }, req);

      return res.status(400).json({
        success: false,
        message: `Insufficient ${paymentMethod} balance`
      });
    }

    // 3. Create withdrawal record
    const reference = `WD-${Date.now()}-${user._id}`;

    const walletTxn = new WalletTransaction({
      wallet: wallet._id,
      type: 'debit',
      amount,
      status: 'pending',
      balanceBefore: availableBalance,
      balanceAfter: availableBalance - amount,
      description: `Withdrawal to ${accountName || accountNumber.slice(-4)}`,
      reference,
      metadata: {
        paymentMethod,
        bankCode,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    await walletTxn.save({ session });

    // 4. Create hold (funds reserved for 48 hours)
    const hold = new WalletHold({
      wallet: wallet._id,
      transaction: walletTxn._id,
      amount,
      reason: 'Withdrawal in progress',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
    });

    await hold.save({ session });

    // 5. Deduct balance atomically
    if (paymentMethod === 'wallet') {
      wallet.balance -= amount;
      wallet.totalDebited = (wallet.totalDebited || 0) + amount;
      wallet.lastTransaction = new Date();
      await wallet.save({ session });
    } else if (paymentMethod === 'balance') {
      await User.findByIdAndUpdate(
        user._id,
        {
          $inc: { balance: -amount },
          $set: { lastTransaction: new Date() }
        },
        { session }
      );
    }

    // 6. Update withdrawal tracking
    await User.findByIdAndUpdate(
      user._id,
      {
        $inc: { 'withdrawalSettings.totalWithdrawalsToday': amount }
      },
      { session }
    );

    // 7. Commit transaction
    await session.commitTransaction();

    // 8. Log successful debit
    await AuditLog.log(user._id, 'withdrawal_attempt', {
      amount,
      reference,
      walletTransactionId: walletTxn._id,
      status: 'pending_transfer'
    }, req);

    res.json({
      success: true,
      message: 'Withdrawal initiated. Funds on hold for 48 hours pending transfer verification.',
      reference,
      amount,
      newBalance: availableBalance - amount,
      holdExpires: new Date(Date.now() + 48 * 60 * 60 * 1000)
    });

    // 9. Now attempt actual transfer (OUTSIDE transaction)
    try {
      if (!accountName) {
        const verifyRes = await verifyAccount(accountNumber, bankCode);
        if (!verifyRes || !verifyRes.requestSuccessful) {
          await AuditLog.log(user._id, 'withdrawal_failed', {
            reference,
            reason: 'account_verification_failed',
            status: 'failure'
          }, req);
          
          // Don't fail - funds already deducted, admin will handle
          return;
        }
        accountName = verifyRes.responseBody?.accountName;
      }

      const result = await initiateTransfer({
        amount,
        accountNumber,
        accountName,
        bankCode,
        reference
      });

      if (result && result.requestSuccessful) {
        // Update wallet transaction to committed
        walletTxn.status = 'committed';
        walletTxn.metadata.transferResponse = result;
        await walletTxn.save();

        // Release hold
        hold.status = 'released';
        hold.releaseReason = 'Transfer successful';
        hold.releasedAt = new Date();
        await hold.save();

        await AuditLog.log(user._id, 'withdrawal_success', {
          amount,
          reference,
          accountName: accountName,
          accountNumber: accountNumber.slice(-4)
        }, req);
      } else {
        // Transfer failed - mark but don't reverse (funds already deducted)
        walletTxn.status = 'failed';
        walletTxn.metadata.failureReason = result?.responseMessage || 'Transfer failed';
        walletTxn.metadata.transferResponse = result;
        await walletTxn.save();

        await AuditLog.log(user._id, 'withdrawal_failed', {
          amount,
          reference,
          reason: 'transfer_failed',
          status: 'failure'
        }, req);
      }
    } catch (transferErr) {
      console.error('Transfer initiation error:', transferErr);
      
      walletTxn.status = 'failed';
      walletTxn.metadata.failureReason = transferErr.message;
      await walletTxn.save();
    }

  } catch (err) {
    await session.abortTransaction();
    console.error('Withdrawal transaction error:', err);

    await AuditLog.log(user._id, 'withdrawal_failed', {
      reason: 'transaction_error',
      error: err.message,
      status: 'failure',
      severity: 'high'
    }, req);

    return res.status(500).json({
      success: false,
      message: 'Withdrawal transaction failed',
      error: err.message
    });
  } finally {
    session.endSession();
  }
};
