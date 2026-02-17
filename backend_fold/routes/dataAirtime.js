const express = require('express')
const router = express.Router()
const User = require('../models/user')
const DataAirtimePackage = require('../models/dataAirtimePackage')
const DataAirtimeTransaction = require('../models/dataAirtimeTransaction')
const { authMiddlewere: authMiddleware } = require('../middleweres/authmiddlewere')
const Transaction = require('../models/transaction')
const DataAirtimeService = require('../services/dataAirtimeService')

// Get all active data packages
router.get('/packages/data', async (req, res) => {
  try {
    const packages = await DataAirtimePackage.find({ 
      type: 'data',
      active: true
    }).sort({ provider: 1, amount: 1 })
    
    res.json({ 
      success: true,
      packages 
    })
  } catch (err) {
    console.error('Error fetching data packages:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch data packages' })
  }
})

// Get all active airtime packages
router.get('/packages/airtime', async (req, res) => {
  try {
    const packages = await DataAirtimePackage.find({ 
      type: 'airtime',
      active: true
    }).sort({ provider: 1, amount: 1 })
    
    res.json({ 
      success: true,
      packages 
    })
  } catch (err) {
    console.error('Error fetching airtime packages:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch airtime packages' })
  }
})

// Buy data
router.post('/buy/data', authMiddleware, async (req, res) => {
  try {
    const { packageId, phoneNumber, pin, paymentMethod = 'wallet' } = req.body
    const userId = req.user._id

    if (!packageId || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Package ID and phone number required' })
    }

    // Get user and package
    const user = await User.findById(userId)
    const pkg = await DataAirtimePackage.findById(packageId)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    if (!pkg || pkg.type !== 'data') {
      return res.status(404).json({ success: false, message: 'Data package not found' })
    }

    // Check if user has set PIN
    if (!user.transactionPinSet) {
      return res.status(400).json({ success: false, message: 'Please set your transaction PIN first' })
    }

    // Check balance based on payment method
    let availableBalance = 0
    if (paymentMethod === 'wallet') {
      const Wallet = require('../models/wallet')
      let wallet = await Wallet.findOne({ user: userId })
      if (!wallet) {
        wallet = await Wallet.create({ user: userId })
      }
      availableBalance = wallet.balance
    } else if (paymentMethod === 'balance') {
      availableBalance = user.balance || 0
    } else {
      return res.status(400).json({ success: false, message: 'Invalid payment method' })
    }

    if (availableBalance < pkg.amount) {
      return res.status(400).json({ success: false, message: `Insufficient ${paymentMethod} balance` })
    }

    // Create transaction
    const transactionRef = `DATA-${userId.toString().slice(-6)}-${Date.now()}`
    const previousBalance = paymentMethod === 'wallet' ? wallet.balance : user.balance

    const transaction = new DataAirtimeTransaction({
      userId,
      userName: user.name || (user.firstName + ' ' + user.lastName),
      userEmail: user.email,
      type: 'data',
      packageId,
      packageName: pkg.name,
      provider: pkg.provider,
      amount: pkg.amount,
      balance: pkg.balance,
      phoneNumber,
      transactionRef,
      previousBalance,
      status: 'pending'
    })

    await transaction.save()

    // Call real data/airtime service
    const providerResult = await DataAirtimeService.purchaseData(
      pkg.provider,
      phoneNumber,
      pkg.balance,
      pkg.amount
    )

    if (!providerResult.success) {
      transaction.status = 'failed'
      transaction.errorMessage = providerResult.message
      await transaction.save()
      return res.status(400).json({ success: false, message: providerResult.message })
    }

    // Debit based on payment method
    let debitResult, newBalance
    if (paymentMethod === 'wallet') {
      const walletController = require('../controllers/walletController')
      debitResult = await walletController.debitWallet(
        userId,
        pkg.amount,
        `Data Purchase: ${pkg.name} (${pkg.balance}MB) for ${phoneNumber}`,
        transactionRef,
        {
          packageId,
          provider: pkg.provider,
          phoneNumber,
          dataAmount: pkg.balance,
          type: 'data_purchase'
        }
      )
      newBalance = debitResult.newBalance
    } else if (paymentMethod === 'balance') {
      // Debit user balance directly
      user.balance -= pkg.amount
      await user.save()
      newBalance = user.balance

      // Create transaction record
      const Transaction = require('../models/transaction')
      await Transaction.create({
        user: userId,
        type: 'debit',
        amount: pkg.amount,
        description: `Data Purchase: ${pkg.name} (${pkg.balance}MB) for ${phoneNumber}`,
        status: 'successful',
        reference: transactionRef,
        related: transaction._id,
        relatedModel: 'DataAirtimeTransaction',
        meta: {
          packageId,
          provider: pkg.provider,
          phoneNumber,
          dataAmount: pkg.balance,
          type: 'data_purchase'
        }
      })
    }

    if (paymentMethod === 'wallet' && !debitResult.success) {
      transaction.status = 'failed'
      transaction.errorMessage = 'Wallet debit failed'
      await transaction.save()
      return res.status(400).json({ success: false, message: 'Wallet debit failed' })
    }
    transaction.newBalance = newBalance
    transaction.status = 'success'
    transaction.completedAt = new Date()
    await transaction.save()

    res.json({
      success: true,
      message: 'Data purchase successful!',
      transaction: {
        ref: transactionRef,
        package: pkg.name,
        amount: pkg.amount,
        data: pkg.balance,
        previousBalance,
        newBalance
      }
    })
  } catch (err) {
    console.error('Error buying data:', err)
    res.status(500).json({ success: false, message: 'Failed to process data purchase' })
  }
})

// Buy airtime
router.post('/buy/airtime', authMiddleware, async (req, res) => {
  try {
    const { packageId, phoneNumber, pin } = req.body
    const userId = req.user._id

    if (!packageId || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Package ID and phone number required' })
    }

    // Get user and package
    const user = await User.findById(userId)
    const pkg = await DataAirtimePackage.findById(packageId)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    if (!pkg || pkg.type !== 'airtime') {
      return res.status(404).json({ success: false, message: 'Airtime package not found' })
    }

    // Check if user has set PIN
    if (!user.transactionPinSet) {
      return res.status(400).json({ success: false, message: 'Please set your transaction PIN first' })
    }

    // Check wallet balance
    const Wallet = require('../models/wallet')
    let wallet = await Wallet.findOne({ user: userId })
    if (!wallet) {
      wallet = await Wallet.create({ user: userId })
    }

    if (wallet.balance < pkg.amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' })
    }

    // Create transaction
    const transactionRef = `AIRTIME-${userId.toString().slice(-6)}-${Date.now()}`
    const previousBalance = wallet.balance

    const transaction = new DataAirtimeTransaction({
      userId,
      userName: user.name || (user.firstName + ' ' + user.lastName),
      userEmail: user.email,
      type: 'airtime',
      packageId,
      packageName: pkg.name,
      provider: pkg.provider,
      amount: pkg.amount,
      balance: pkg.balance,
      phoneNumber,
      transactionRef,
      previousBalance,
      status: 'pending'
    })

    await transaction.save()

    // Call real data/airtime service
    const providerResult = await DataAirtimeService.purchaseAirtime(
      pkg.provider,
      phoneNumber,
      pkg.balance,
      pkg.amount
    )

    if (!providerResult.success) {
      transaction.status = 'failed'
      transaction.errorMessage = providerResult.message
      await transaction.save()
      return res.status(400).json({ success: false, message: providerResult.message })
    }

    // Debit wallet
    const walletController = require('../controllers/walletController')
    const debitResult = await walletController.debitWallet(
      userId,
      pkg.amount,
      `Airtime Purchase: ₦${pkg.balance} from ${pkg.provider} to ${phoneNumber}`,
      transactionRef,
      {
        packageId,
        provider: pkg.provider,
        phoneNumber,
        airtimeAmount: pkg.balance,
        type: 'airtime_purchase'
      }
    )

    if (!debitResult.success) {
      transaction.status = 'failed'
      transaction.errorMessage = 'Wallet debit failed'
      await transaction.save()
      return res.status(400).json({ success: false, message: 'Wallet debit failed' })
    }

    const newBalance = debitResult.newBalance
    transaction.newBalance = newBalance
    transaction.status = 'success'
    transaction.completedAt = new Date()
    await transaction.save()

    res.json({
      success: true,
      message: 'Airtime purchase successful!',
      transaction: {
        ref: transactionRef,
        package: pkg.name,
        amount: pkg.amount,
        airtime: pkg.balance,
        previousBalance,
        newBalance
      }
    })
  } catch (err) {
    console.error('Error buying airtime:', err)
    res.status(500).json({ success: false, message: 'Failed to process airtime purchase' })
  }
})

// Get transaction history for user
router.get('/transactions/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id
    const { type, limit = 10, skip = 0 } = req.query

    let query = { userId }
    if (type) {
      query.type = type
    }

    const transactions = await DataAirtimeTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))

    const total = await DataAirtimeTransaction.countDocuments(query)

    res.json({
      success: true,
      transactions,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    })
  } catch (err) {
    console.error('Error fetching transaction history:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch transaction history' })
  }
})

// Get summary stats for dashboard
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const dataTransactions = await DataAirtimeTransaction.find({
      userId,
      type: 'data',
      createdAt: { $gte: thirtyDaysAgo }
    })

    const airtimeTransactions = await DataAirtimeTransaction.find({
      userId,
      type: 'airtime',
      createdAt: { $gte: thirtyDaysAgo }
    })

    const totalDataSpent = dataTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const totalAirtimeSpent = airtimeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const totalDataBought = dataTransactions.reduce((sum, t) => sum + (t.balance || 0), 0)
    const totalAirtimeBought = airtimeTransactions.reduce((sum, t) => sum + (t.balance || 0), 0)

    res.json({
      success: true,
      stats: {
        totalDataSpent,
        totalAirtimeSpent,
        totalDataBought,
        totalAirtimeBought,
        dataTransactionCount: dataTransactions.length,
        airtimeTransactionCount: airtimeTransactions.length,
        lastDataPurchase: dataTransactions[0] || null,
        lastAirtimePurchase: airtimeTransactions[0] || null
      }
    })
  } catch (err) {
    console.error('Error fetching stats:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' })
  }
})

// Admin: Add package
router.post('/admin/packages', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    const { name, type, provider, amount, balance, description, icon } = req.body

    if (!name || !type || !provider || !amount || !balance) {
      return res.status(400).json({ success: false, message: 'All fields required' })
    }

    const pkg = new DataAirtimePackage({
      name,
      type,
      provider,
      amount,
      balance,
      description,
      icon
    })

    await pkg.save()

    res.json({
      success: true,
      message: 'Package created successfully',
      package: pkg
    })
  } catch (err) {
    console.error('Error creating package:', err)
    res.status(500).json({ success: false, message: 'Failed to create package' })
  }
})

// Admin: Get all packages
router.get('/admin/packages', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    const packages = await DataAirtimePackage.find().sort({ type: 1, provider: 1, amount: 1 })

    res.json({
      success: true,
      packages
    })
  } catch (err) {
    console.error('Error fetching packages:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch packages' })
  }
})

// Admin: Delete package
router.delete('/admin/packages/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    const pkg = await DataAirtimePackage.findByIdAndUpdate(req.params.id, { active: false }, { new: true })

    res.json({
      success: true,
      message: 'Package deactivated',
      package: pkg
    })
  } catch (err) {
    console.error('Error deleting package:', err)
    res.status(500).json({ success: false, message: 'Failed to delete package' })
  }
})

module.exports = router
