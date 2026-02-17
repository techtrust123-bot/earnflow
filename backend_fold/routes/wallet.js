const express = require('express')
const router = express.Router()
const walletController = require('../controllers/walletController')
const { authMiddlewere: authMiddleware } = require('../middleweres/authmiddlewere')

// Get wallet balance
router.get('/balance', authMiddleware, walletController.getBalance)

// Get transaction history
router.get('/transactions', authMiddleware, walletController.getTransactionHistory)

// Fund wallet
router.post('/fund', authMiddleware, walletController.fundWallet)

// Verify funding (callback)
router.get('/verify/:reference', authMiddleware, walletController.verifyFunding)

module.exports = router