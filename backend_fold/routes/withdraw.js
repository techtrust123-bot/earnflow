const { withdraw } = require("../controllers/withdrawController");
const { authMiddlewere } = require("../middleweres/authmiddlewere");
const { withdrawalAttempts } = require("../middleweres/rateLimiter");
const { validateWithdrawal } = require("../middleweres/inputValidation");

const router = require("express").Router();

// Verify account number
router.post("/verify-account", authMiddlewere, async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({ success: false, message: 'Account number and bank code required' });
    }

    if (!/^[0-9]{10}$/.test(accountNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid account number format' });
    }

    // Use the existing verifyAccount function from paystack service
    const { verifyAccount } = require('../services/paystack');
    const result = await verifyAccount(accountNumber, bankCode);

    if (!result.requestSuccessful) {
      return res.status(400).json({ success: false, message: 'Account verification failed. Please check your details.' });
    }

    res.json({
      success: true,
      accountName: result.responseBody.accountName,
      message: 'Account verified successfully'
    });
  } catch (error) {
    console.error('Account verification error:', error);
    res.status(500).json({ success: false, message: 'Account verification service temporarily unavailable' });
  }
});

router.post("/request", authMiddlewere, withdrawalAttempts, validateWithdrawal, withdraw)

module.exports = router;