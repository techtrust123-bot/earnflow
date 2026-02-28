# SECURITY IMPLEMENTATION GUIDE
## Flowearn Security Fixes - Step-by-Step

---

## Priority 0: Critical Fixes (Do Within 24 Hours)

### Fix 1: Rate Limiting on All Endpoints

**File:** `middleware/rateLimiter.js` (NEW)

```javascript
const rateLimit = require('express-rate-limit');

// Store in Redis for production (more scalable)
// For MVP, can use default memory store

const generalApi = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false
});

const authLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts",
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Rate limit by email, not just IP (prevents account enumeration)
    return req.body?.email || req.ip;
  }
});

const otpAttempts = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 3,
  message: "Too many OTP attempts",
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, else by IP+email
    return req.user?._id || `${req.ip}-${req.body?.email}`;
  }
});

const withdrawalAttempts = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,
  message: "Withdrawal limit reached. Try again later."
});

module.exports = {
  generalApi,
  authLogin,
  otpAttempts,
  withdrawalAttempts
};
```

**File:** `server.js` (UPDATE)

```javascript
// Add after app setup
const { generalApi, authLogin, otpAttempts, withdrawalAttempts } = 
  require('./middleware/rateLimiter');

// Global rate limit for all API calls
app.use('/api/', generalApi);

// Apply to routes
// [Note: Update route files below]
```

**File:** `routes/authRoute.js` (UPDATE)

```javascript
const express = require("express");
const { 
  register, login, logout, verifyAccount, 
  sendResetOtp, resetPassword, resendOtp, 
  getCurrentUser, deleteAccount, 
  setTransactionPin, verifyTransactionPin 
} = require("../controllers/authController");
const { authMiddlewere } = require("../middleweres/authmiddlewere");
const { authLogin, otpAttempts } = require("../middleware/rateLimiter");

const router = express.Router();

// Rate limiting
router.post("/register", authLogin, register);  // 5 attempts per 15 min
router.post("/login", authLogin, login);        // 5 attempts per 15 min
router.post("/verify", otpAttempts, authMiddlewere, verifyAccount);  // 3 per min
router.post("/resendOtp", otpAttempts, authMiddlewere, resendOtp);   // 3 per min
router.post("/sendReset", authLogin, sendResetOtp);  // 5 per 15 min
router.post("/resetPassword", authLogin, resetPassword);  // 5 per 15 min

router.post("/logout", authMiddlewere, logout);
router.post("/set-pin", authMiddlewere, setTransactionPin);
router.post("/verify-pin", authMiddlewere, verifyTransactionPin);
router.get('/me', authMiddlewere, getCurrentUser);
router.delete('/delete', authMiddlewere, deleteAccount);

module.exports = router;
```

**File:** `routes/withdraw.js` (UPDATE)

```javascript
const { withdraw } = require("../controllers/withdrawController");
const { authMiddlewere } = require("../middleweres/authmiddlewere");
const { withdrawalAttempts } = require("../middleware/rateLimiter");

const router = require("express").Router();

router.post("/request", authMiddlewere, withdrawalAttempts, withdraw);

module.exports = router;
```

---

### Fix 2: Prevent Double-Spending with Atomic Transactions

**File:** `controllers/withdrawController.js` (REPLACE)

```javascript
const { initiateTransfer, verifyAccount } = require('../services/paystack');
const User = require('../models/user');
const Wallet = require('../models/wallet');
const Transaction = require('../models/transaction');
const mongoose = require('mongoose');

exports.withdraw = async (req, res) => {
  const user = req.user;
  let { amount, accountNumber, accountName, bankCode, paymentMethod = 'balance' } = req.body;

  amount = Number(amount);

  // Input validation
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
  if (amount < 500) return res.status(400).json({ message: 'Minimum withdrawal is ₦500' });
  if (!/^[0-9]{10}$/.test(String(accountNumber))) {
    return res.status(400).json({ message: 'Invalid account number format' });
  }
  if (!bankCode) return res.status(400).json({ message: 'Missing bank code' });

  // START TRANSACTION
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch and lock wallet/user
    let wallet = await Wallet.findOne({ user: user._id }).session(session);
    if (!wallet) {
      wallet = await Wallet.create([{ user: user._id }], { session });
      wallet = wallet[0];
    }

    // 2. Check balance inside transaction (for accuracy)
    let availableBalance = 0;
    if (paymentMethod === 'wallet') {
      availableBalance = wallet.balance;
    } else if (paymentMethod === 'balance') {
      // Refresh user from DB inside transaction
      const freshUser = await User.findById(user._id).session(session);
      availableBalance = freshUser.balance || 0;
    } else {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    if (availableBalance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ message: `Insufficient ${paymentMethod} balance` });
    }

    // 3. Create withdrawal record (BEFORE deducting)
    const reference = `WD-${Date.now()}-${user._id}`;

    const transaction = new Transaction({
      user: user._id,
      type: 'debit',
      amount,
      description: `Withdrawal to ${accountName || accountNumber}`,
      status: 'pending',  // NOT yet committed
      reference,
      related: null,
      relatedModel: 'Payment',
      meta: {
        paymentMethod,
        bankCode,
        accountNumber,
        accountName,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    await transaction.save({ session });

    // 4. Deduct balance inside transaction
    if (paymentMethod === 'wallet') {
      wallet.balance -= amount;
      wallet.totalDebited += amount;
      wallet.lastTransaction = new Date();
      await wallet.save({ session });
    } else if (paymentMethod === 'balance') {
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          $inc: { balance: -amount, totalDebited: amount },
          $set: { lastTransaction: new Date() }
        },
        { new: true, session }
      );
      if (!updatedUser) throw new Error('User not found');
    }

    // 5. Commit debit (funds are now deducted, but still pending transfer)
    await session.commitTransaction();

    // 6. Now attempt actual transfer (OUTSIDE transaction)
    // If this fails, funds remain deducted but transaction marked as 'failed'
    // Admin can manually reverse via support

    try {
      if (!accountName) {
        const verifyRes = await verifyAccount(accountNumber, bankCode);
        if (!verifyRes || !verifyRes.requestSuccessful) {
          // Update transaction status to failed
          transaction.status = 'failed';
          transaction.meta.failureReason = 'Account verification failed';
          await transaction.save();

          // REVERSE the debit
          const reverseSession = await mongoose.startSession();
          reverseSession.startTransaction();
          try {
            if (paymentMethod === 'wallet') {
              wallet.balance += amount;
              await wallet.save({ session: reverseSession });
            } else {
              await User.findByIdAndUpdate(
                user._id,
                { $inc: { balance: amount } },
                { session: reverseSession }
              );
            }
            await reverseSession.commitTransaction();
          } catch(e) {
            await reverseSession.abortTransaction();
          } finally {
            reverseSession.endSession();
          }

          return res.status(400).json({ message: 'Account verification failed' });
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

      if (!result || !result.requestSuccessful) {
        // Update transaction status to failed but DON'T reverse
        // (funds are deducted, admin to investigate)
        transaction.status = 'failed';
        transaction.meta.failureReason = result?.responseMessage || 'Transfer failed';
        transaction.meta.transferResponse = result;
        await transaction.save();

        return res.status(400).json({
          message: result?.responseMessage || 'Transfer failed',
          reference
        });
      }

      // Transfer succeeded - update transaction
      transaction.status = 'successful';
      transaction.meta.transferResponse = result;
      await transaction.save();

      // Get updated balance
      let newBalance;
      if (paymentMethod === 'wallet') {
        const updatedWallet = await Wallet.findOne({ user: user._id });
        newBalance = updatedWallet.balance;
      } else {
        const updatedUser = await User.findById(user._id);
        newBalance = updatedUser.balance;
      }

      return res.json({
        success: true,
        message: 'Withdrawal completed successfully',
        reference,
        newBalance,
        amount
      });

    } catch (transferErr) {
      // Transfer API failed - mark transaction as failed
      console.error('Transfer error:', transferErr);
      
      transaction.status = 'failed';
      transaction.meta.failureReason = transferErr.message;
      await transaction.save();

      // TODO: Send notification to user that funds are held
      // They can contact support for reversal

      return res.status(500).json({
        message: 'Transfer service error. Funds are on hold. Contact support.',
        reference
      });
    }

  } catch (err) {
    await session.abortTransaction();
    console.error('Withdraw transaction error:', err);
    return res.status(500).json({ message: 'Withdrawal failed: ' + err.message });
  } finally {
    session.endSession();
  }
};
```

---

### Fix 3: Account Verification Required for Withdrawal

**File:** `controllers/withdrawController.js` (ADD CHECK)

```javascript
// Add this at the start of withdraw function
if (!user.isAccountVerify) {
  return res.status(403).json({
    message: "Please verify your email before withdrawing",
    requiresVerification: true
  });
}
```

---

### Fix 4: Input Validation

**Install:** `npm install express-validator`

**File:** `routes/withdraw.js` (UPDATE)

```javascript
const express = require("express");
const { body, validationResult } = require("express-validator");
const { withdraw } = require("../controllers/withdrawController");
const { authMiddlewere } = require("../middleweres/authmiddlewere");
const { withdrawalAttempts } = require("../middleware/rateLimiter");

const router = express.Router();

const validateWithdrawal = [
  body('amount')
    .isInt({ min: 500, max: 1000000 })
    .withMessage('Amount must be between ₦500 and ₦1,000,000'),
  body('accountNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Account number must be exactly 10 digits'),
  body('bankCode')
    .notEmpty()
    .withMessage('Bank code is required'),
  body('paymentMethod')
    .optional()
    .isIn(['balance', 'wallet'])
    .withMessage('Invalid payment method')
];

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

router.post(
  "/request",
  authMiddlewere,
  withdrawalAttempts,
  validateWithdrawal,
  validationMiddleware,
  withdraw
);

module.exports = router;
```

I'll also create similar validation for user task creation:

**File:** `routes/userTasks.js` (CREATE/UPDATE)

```javascript
const express = require("express");
const { body, validationResult } = require("express-validator");
const { createUserTask, getMyTasks, checkPayment } = require("../controllers/userTaskController");
const { authMiddlewere } = require("../middleweres/authmiddlewere");

const router = express.Router();

const validateCreateTask = [
  body('numUsers')
    .isInt({ min: 100, max: 1000000 })
    .withMessage('Number of users must be between 100 and 1,000,000'),
  body('taskAmount')
    .isInt({ min: 50, max: 100000 })
    .withMessage('Task amount must be between ₦50 and ₦100,000'),
  body('platform')
    .isIn(['twitter', 'tiktok', 'instagram', 'facebook', 'youtube'])
    .withMessage('Invalid platform'),
  body('action')
    .isIn(['follow', 'like', 'repost', 'comment', 'share', 'subscribe'])
    .withMessage('Invalid action'),
  body('socialHandle')
    .notEmpty()
    .trim()
    .withMessage('Social handle is required'),
  body('taskDetails')
    .notEmpty()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Task details required (max 1000 chars)'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title is too long')
];

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

router.post(
  "/create",
  authMiddlewere,
  validateCreateTask,
  validationMiddleware,
  createUserTask
);

router.get("/my-tasks", authMiddlewere, getMyTasks);
router.get("/check-payment/:ref", checkPayment);

module.exports = router;
```

---

### Fix 5: Withdrawal Daily Limits

**File:** `models/user.js` (ADD FIELDS)

```javascript
// Add to userSchema:
{
  withdrawalSettings: {
    dailyLimit: {
      type: Number,
      default: 50000  // ₦50,000 per day
    },
    weeklyLimit: {
      type: Number,
      default: 200000  // ₦200,000 per week
    },
    lastWithdrawalDate: Date,
    totalWithdrawalsToday: {
      type: Number,
      default: 0
    },
    totalWithdrawalsThisWeek: {
      type: Number,
      default: 0
    }
  }
}
```

**File:** `controllers/withdrawController.js` (ADD LIMIT CHECK)

```javascript
// Add to withdraw function before creating transaction:

const today = new Date().toDateString();
const userWithdrawalDate = user.withdrawalSettings?.lastWithdrawalDate?.toDateString();

// Reset daily counter if new day
if (userWithdrawalDate !== today) {
  user.withdrawalSettings.totalWithdrawalsToday = 0;
  user.withdrawalSettings.lastWithdrawalDate = new Date();
}

// Check daily limit
const dailyTotal = user.withdrawalSettings.totalWithdrawalsToday + amount;
if (dailyTotal > user.withdrawalSettings.dailyLimit) {
  return res.status(400).json({
    message: `Daily withdrawal limit exceeded. Limit: ₦${user.withdrawalSettings.dailyLimit}, Already withdrawn today: ₦${user.withdrawalSettings.totalWithdrawalsToday}`,
    remainingToday: user.withdrawalSettings.dailyLimit - user.withdrawalSettings.totalWithdrawalsToday
  });
}

// After successful withdrawal, update counters:
user.withdrawalSettings.totalWithdrawalsToday = dailyTotal;
```

---

## Priority 1: High-Value Fixes (Week 1-2)

### Fix 6: Stronger OTP Implementation

**File:** `controllers/authController.js` (UPDATE register & login)

```javascript
const crypto = require('crypto');

exports.register = async(req, res) => {
  const { name, email, phoneNumber, password } = req.body;

  // ... existing validation ...

  try {
    // ... existing user creation ...

    // Generate 8-digit OTP (stronger than 6-digit)
    const otp = crypto.randomInt(10000000, 100000000).toString();

    // Hash OTP for storage (don't store plaintext!)
    const otpHash = crypto.createHash('sha256')
      .update(otp + process.env.OTP_SALT)
      .digest('hex');

    user.verifyOtpHash = otpHash;
    user.verifyOtpExpireAt = Date.now() + 5 * 60 * 1000;  // 5 min only (not 10)
    user.verifyOtpAttempts = 0;

    await user.save();

    // Send via multiple channels
    await sendOtpViaEmail(email, otp);
    await sendOtpViaSms(phoneNumber, otp);  // Add SMS provider

    res.json({ success: true, message: 'Verification OTP sent' });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyAccount = async(req, res) => {
  const { otp } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);

    // Rate limiting checks
    if (user.verifyOtpLastAttempt) {
      const timeSinceLastAttempt = Date.now() - user.verifyOtpLastAttempt;
      const windowMs = 5 * 60 * 1000;

      if (timeSinceLastAttempt < windowMs && user.verifyOtpAttempts >= 3) {
        return res.status(429).json({
          message: "Too many failed attempts. Try again in 5 minutes.",
          retryAfter: Math.ceil((windowMs - timeSinceLastAttempt) / 1000)
        });
      }

      // Reset counter after window
      if (timeSinceLastAttempt >= windowMs) {
        user.verifyOtpAttempts = 0;
      }
    }

    // Check expiration
    if (user.verifyOtpExpireAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }

    // Verify OTP using timing-safe comparison
    const providedHash = crypto.createHash('sha256')
      .update(otp + process.env.OTP_SALT)
      .digest('hex');

    const timingSafeEqual = crypto.timingSafeEqual(
      Buffer.from(providedHash),
      Buffer.from(user.verifyOtpHash)
    );

    if (!timingSafeEqual) {
      user.verifyOtpAttempts = (user.verifyOtpAttempts || 0) + 1;
      user.verifyOtpLastAttempt = Date.now();
      await user.save();

      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Valid OTP - mark as verified
    user.isAccountVerify = true;
    user.accountStatus = "Verified";
    user.verifyOtpHash = undefined;
    user.verifyOtpExpireAt = undefined;
    user.verifyOtpAttempts = 0;

    await user.save();

    // Handle referral bonus (if applicable)
    // ... [existing referral code] ...

    res.json({ success: true, message: "Account verified" });

  } catch(error) {
    res.status(500).json({ message: error.message });
  }
};
```

**Add to User Model:**

```javascript
// In user.js schema:
{
  verifyOtpHash: String,        // Hash of OTP (not plaintext)
  verifyOtpAttempts: {
    type: Number,
    default: 0
  },
  verifyOtpLastAttempt: Date,   // Track attempts across time window
  phoneVerified: {
    type: Boolean,
    default: false
  }
}
```

---

### Fix 7: Transaction PIN for Withdrawals

**File:** `controllers/authController.js` (ADD NEW EXPORTS)

```javascript
exports.setTransactionPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Validate PIN
    if (!pin || pin.length < 4 || pin.length > 6) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be 4-6 digits'
      });
    }

    if (!/^\d+$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must contain only numbers'
      });
    }

    // Check for sequential/repeated patterns (weak PINs)
    if (/(.)\1{3,}/.test(pin) || /^(01|12|23|34|45|56|67|78|89)+$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN cannot be sequential or repeated digits'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);
    user.transactionPin = hashedPin;
    user.transactionPinSet = true;
    await user.save();

    res.json({
      success: true,
      message: 'Transaction PIN set successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to set PIN' });
  }
};

exports.verifyTransactionPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN required' });
    }

    const user = await User.findById(userId);
    if (!user || !user.transactionPinSet) {
      return res.status(400).json({
        success: false,
        message: 'PIN not set for this account'
      });
    }

    const pinMatches = await bcrypt.compare(pin, user.transactionPin);
    if (!pinMatches) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    res.json({
      success: true,
      message: 'PIN verified successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify PIN' });
  }
};
```

**File:** `routes/authRoute.js` (ADD ROUTES)

```javascript
router.post("/set-pin", authMiddlewere, setTransactionPin);
router.post("/verify-pin", authMiddlewere, verifyTransactionPin);
```

**File:** `controllers/withdrawController.js` (UPDATE - ADD PIN CHECK)

```javascript
// Add to withdraw function:
const { pin } = req.body;

// Require PIN for withdrawal
if (!user.transactionPinSet) {
  return res.status(400).json({
    message: "Please set up transaction PIN first",
    setupLink: "/auth/set-pin"
  });
}

if (!pin) {
  return res.status(400).json({
    message: "Transaction PIN required for withdrawals"
  });
}

// Verify PIN
const pinValid = await bcrypt.compare(pin, user.transactionPin);
if (!pinValid) {
  return res.status(401).json({ message: "Invalid transaction PIN" });
}
```

---

### Fix 8: Create Audit Log System

**File:** `models/auditLog.js` (NEW)

```javascript
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'earn-users',
    index: true
  },
  action: {
    type: String,
    enum: [
      'login',
      'logout',
      'register',
      'password_change',
      'otp_verify',
      'withdrawal_attempt',
      'withdrawal_success',
      'withdrawal_failed',
      'task_completion',
      'task_failure',
      'balance_update',
      'settings_change',
      'admin_action'
    ],
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 90 * 24 * 60 * 60  // Auto-delete after 90 days
  }
}, { timestamps: false });

auditLogSchema.statics.log = async function(userId, action, details = {}, req = null) {
  try {
    const message = new this({
      user: userId,
      action,
      details,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
      status: details.status || 'success'
    });
    await message.save();
  } catch (err) {
    console.warn('Audit log failed:', err.message);
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
```

**File:** `controllers/withdrawController.js` (ADD LOGGING)

```javascript
const AuditLog = require('../models/auditLog');

exports.withdraw = async (req, res) => {
  const user = req.user;
  // ... validation ...

  try {
    // ... transaction code ...

    // Log successful withdrawal
    await AuditLog.log(
      user._id,
      'withdrawal_success',
      {
        amount,
        reference,
        accountNumber: accountNumber.slice(-4),  // Mask account number
        bankCode
      },
      req
    );

    return res.json({ /* ... */ });
  } catch (err) {
    // Log failed withdrawal
    await AuditLog.log(
      user._id,
      'withdrawal_failed',
      {
        amount,
        error: err.message,
        status: 'failure'
      },
      req
    );

    return res.status(500).json({ message: err.message });
  }
};
```

---

## Priority 2: Detection & Monitoring (Week 2-3)

### Fix 9: Implement Fraud Scoring Service

**File:** `services/fraudDetection.js` (NEW)

```javascript
const TaskCompletion = require('../models/taskCompletion');
const Withdrawal = require('../models/withdrawal');
const AuditLog = require('../models/auditLog');
const Session = require('../models/session');

exports.calculateFraudScore = async (user, context = {}) => {
  let fraudScore = 0;
  const indicators = [];

  try {
    // 1. Account age
    const accountAgeDays = (Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 1) {
      fraudScore += 25;
      indicators.push('brand_new_account');
    } else if (accountAgeDays < 7) {
      fraudScore += 15;
      indicators.push('very_new_account');
    }

    // 2. Email verification
    if (!user.isAccountVerify) {
      fraudScore += 20;
      indicators.push('unverified_email');
    }

    // 3. Failed verification attempts
    const failedCompletions = await TaskCompletion.countDocuments({
      user: user._id,
      status: 'failed',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (failedCompletions > 10) {
      fraudScore += 30;
      indicators.push(`high_failed_attempts:${failedCompletions}`);
    }

    // 4. Rapid task completion
    const tasksLast30Min = await TaskCompletion.countDocuments({
      user: user._id,
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
    });

    if (tasksLast30Min > 20) {
      fraudScore += 35;
      indicators.push(`rapid_completions:${tasksLast30Min}/30min`);
    }

    // 5. Duplicate tasks (user completing same task multiple times)
    const taskDuplicates = await TaskCompletion.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$task', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (taskDuplicates.length > 0) {
      fraudScore += taskDuplicates.length * 10;
      indicators.push(`duplicate_task_attempts:${taskDuplicates.length}`);
    }

    // 6. Abnormal earnings
    const totalEarnings = user.balance + (user.totalDebited || 0);
    const taskCount = await TaskCompletion.countDocuments({
      user: user._id,
      status: 'rewarded'
    });

    const avgReward = taskCount > 0 ? totalEarnings / taskCount : 0;
    if (avgReward > 5000) {
      fraudScore += 20;
      indicators.push(`high_avg_reward:${avgReward}`);
    }

    // 7. Many failed withdrawal attempts
    const failedWithdrawals = await AuditLog.countDocuments({
      user: user._id,
      action: 'withdrawal_failed',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (failedWithdrawals > 3) {
      fraudScore += 15;
      indicators.push(`multiple_failed_withdrawals:${failedWithdrawals}`);
    }

    // 8. Many IP addresses (account sharing / account takeover)
    const uniqueIPs = await Session.find({
      user: user._id,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).distinct('ipAddress');

    if (uniqueIPs.length > 10) {
      fraudScore +=  25;
      indicators.push(`many_ips:${uniqueIPs.length}`);
    }

  } catch (err) {
    console.error('Fraud score calculation failed:', err);
  }

  return {
    fraudScore: Math.min(fraudScore, 100),
    indicators,
    level: fraudScore >= 80 ? 'critical' : fraudScore >= 50 ? 'high' : fraudScore >= 25 ? 'medium' : 'low'
  };
};

exports.shouldBlockWithdrawal = async (user, amount) => {
  const fraud = await exports.calculateFraudScore(user, { withdrawal: true });

  if (fraud.fraudScore >= 80) {
    return {
      blocked: true,
      reason: 'High fraud risk detected',
      contactSupport: true
    };
  }

  if (fraud.fraudScore >= 50) {
    return {
      requiresManualReview: true,
      reason: 'Transaction requires manual approval'
    };
  }

  return { blocked: false };
};
```

**File:** `controllers/withdrawController.js` (INTEGRATE FRAUD DETECTION)

```javascript
const fraudDetection = require('../services/fraudDetection');

exports.withdraw = async (req, res) => {
  const user = req.user;
  const { amount, accountNumber, bankCode, pin } = req.body;

  // ... existing validation ...

  try {
    // Check fraud score
    const fraudCheck = await fraudDetection.shouldBlockWithdrawal(user, amount);

    if (fraudCheck.blocked) {
      await AuditLog.log(
        user._id,
        'withdrawal_failed',
        { reason: fraudCheck.reason, fraud: true, status: 'failure' },
        req
      );

      return res.status(403).json({
        message: fraudCheck.reason,
        contactSupport: fraudCheck.contactSupport
      });
    }

    if (fraudCheck.requiresManualReview) {
      // Create pending withdrawal request for manual review
      const withdrawalRequest = new WithdrawalRequest({
        user: user._id,
        amount,
        accountNumber,
        bankCode,
        status: 'pending_review',
        reason: fraudCheck.reason
      });
      await withdrawalRequest.save();

      return res.json({
        success: true,
        message: 'Your withdrawal is pending review. You will be notified within 2 hours.',
        requestId: withdrawalRequest._id
      });
    }

    // ... proceed with normal withdrawal ...
  } catch (err) {
    // ...
  }
};
```

---

## Implementation Timeline

| Week | Task | Time | Priority |
|------|------|------|----------|
| 1 | Rate limiting | 2 hrs | CRITICAL |
| 1 | Input validation | 3 hrs | CRITICAL |
| 1 | Atomic transactions (withdraw) | 4 hrs | CRITICAL |
| 1 | Account verification check | 1 hr | CRITICAL |
| 1 | Daily withdrawal limits | 2 hrs | CRITICAL |
| 2 | Stronger OTP (8-digit + SMS) | 3 hrs | HIGH |
| 2 | Transaction PIN | 2 hrs | HIGH |
| 2 | Audit logging | 3 hrs | HIGH |
| 2 | Fraud detection service | 4 hrs | HIGH |
| 3 | Device fingerprinting | 3 hrs | MEDIUM |
| 3 | Risk scoring | 4 hrs | MEDIUM |
| 3 | Testing & refinement | 8 hrs | MEDIUM |

---

## Testing Checklist

After implementing each fix:

- [ ] Unit tests for validation functions
- [ ] Integration tests for transaction atomicity
- [ ] Concurrent request tests (verify no double-spending)
- [ ] Rate limiting tests
- [ ] OTP brute-force test (verify 3-attempt limit)
- [ ] Withdrawal limit tests
- [ ] Fraud detection tests
- [ ] Load testing (ensure performance)
- [ ] Security header verification
- [ ] CSRF token validation

---

## Deployment Checklist

Before pushing to production:

- [ ] All code reviewed by security engineer
- [ ] Tests passing 100%
- [ ] Performance benchmarks meet requirements
- [ ] Database backups verified
- [ ] Monitoring/alerts configured
- [ ] Rollback plan documented
- [ ] User communication drafted
- [ ] Support team trained

