const Wallet = require('../models/wallet')
const User = require('../models/user')
const Transaction = require('../models/transaction')
const crypto = require('crypto')
const axios = require('axios')

// Get wallet balance
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user._id

    let wallet = await Wallet.findOne({ user: userId })
    if (!wallet) {
      wallet = await Wallet.create({ user: userId })
    }

    res.json({
      success: true,
      balance: wallet.balance,
      totalCredited: wallet.totalCredited,
      totalDebited: wallet.totalDebited
    })
  } catch (error) {
    console.error('Get balance error:', error)
    res.status(500).json({ success: false, message: 'Failed to get balance' })
  }
}

// Get transaction history
exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user._id
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('related', 'name')

    const total = await Transaction.countDocuments({ user: userId })

    res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get transaction history error:', error)
    res.status(500).json({ success: false, message: 'Failed to get transaction history' })
  }
}

// Initialize wallet funding with Paystack
exports.fundWallet = async (req, res) => {
  try {
    const { amount, email } = req.body
    const userId = req.user._id

    if (!amount || amount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum funding amount is ₦100' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const reference = `WALLET-${userId.toString().slice(-6)}-${Date.now()}`

    // Create pending transaction
    const transaction = new Transaction({
      user: userId,
      type: 'credit',
      amount,
      description: 'Wallet funding',
      status: 'pending',
      reference,
      meta: {
        type: 'wallet_funding',
        provider: 'paystack'
      }
    })
    await transaction.save()

    // Initialize Paystack transaction
    const paystackResponse = await axios.post('https://api.paystack.co/transaction/initialize', {
      email: email || user.email,
      amount: amount * 100, // Paystack expects amount in kobo
      reference,
      callback_url: `${process.env.FRONTEND_URL}/wallet/callback`,
      metadata: {
        userId: userId.toString(),
        type: 'wallet_funding'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!paystackResponse.data.status) {
      transaction.status = 'failed'
      await transaction.save()
      return res.status(400).json({ success: false, message: 'Failed to initialize payment' })
    }

    res.json({
      success: true,
      reference,
      authorization_url: paystackResponse.data.data.authorization_url,
      access_code: paystackResponse.data.data.access_code
    })

  } catch (error) {
    console.error('Fund wallet error:', error)
    res.status(500).json({ success: false, message: 'Failed to initialize funding' })
  }
}

// Verify wallet funding (for callback)
exports.verifyFunding = async (req, res) => {
  try {
    const { reference } = req.params

    const transaction = await Transaction.findOne({ reference, 'meta.type': 'wallet_funding' })
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' })
    }

    if (transaction.status === 'successful') {
      return res.json({ success: true, message: 'Payment already verified' })
    }

    // Verify with Paystack
    const paystackResponse = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    })

    const { data } = paystackResponse.data

    if (data.status === 'success') {
      // Credit wallet
      let wallet = await Wallet.findOne({ user: transaction.user })
      if (!wallet) {
        wallet = await Wallet.create({ user: transaction.user })
      }

      await wallet.credit(transaction.amount, 'Wallet funding via Paystack', reference, {
        paystack_reference: data.reference,
        paystack_transaction_id: data.id
      })

      // Update transaction
      transaction.status = 'successful'
      transaction.meta.paystack_data = data
      await transaction.save()

      // Update user balance (for backward compatibility)
      await User.findByIdAndUpdate(transaction.user, {
        $inc: { balance: transaction.amount }
      })

      res.json({ success: true, message: 'Wallet funded successfully' })
    } else {
      transaction.status = 'failed'
      transaction.meta.paystack_data = data
      await transaction.save()

      res.status(400).json({ success: false, message: 'Payment verification failed' })
    }

  } catch (error) {
    console.error('Verify funding error:', error)
    res.status(500).json({ success: false, message: 'Failed to verify payment' })
  }
}

// Debit wallet (for purchases)
exports.debitWallet = async (userId, amount, description, reference, meta = {}) => {
  try {
    let wallet = await Wallet.findOne({ user: userId })
    if (!wallet) {
      wallet = await Wallet.create({ user: userId })
    }

    if (wallet.balance < amount) {
      throw new Error('Insufficient wallet balance')
    }

    await wallet.debit(amount, description, reference, meta)

    // Update user balance for backward compatibility
    await User.findByIdAndUpdate(userId, {
      $inc: { balance: -amount }
    })

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      type: 'debit',
      amount,
      description,
      status: 'successful',
      reference,
      meta: { ...meta, type: 'wallet_debit' }
    })
    await transaction.save()

    return { success: true, newBalance: wallet.balance }

  } catch (error) {
    console.error('Debit wallet error:', error)
    throw error
  }
}