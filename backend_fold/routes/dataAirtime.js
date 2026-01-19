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
    if (!pkg || pkg.type !== 'data') {
      return res.status(404).json({ success: false, message: 'Data package not found' })
    }

    // Check if user has set PIN
    if (!user.transactionPinSet) {
      return res.status(400).json({ success: false, message: 'Please set your transaction PIN first' })
    }

    // Check balance
    if (user.balance < pkg.amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' })
    }

    // Create transaction
    const transactionRef = `DATA-${userId.toString().slice(-6)}-${Date.now()}`
    const previousBalance = user.balance

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

    // Deduct balance
    user.balance -= pkg.amount
    const newBalance = user.balance
    transaction.newBalance = newBalance
    transaction.status = 'success'
    transaction.completedAt = new Date()
    await transaction.save()
    await user.save()

    // Create main transaction record
    const mainTransaction = new Transaction({
      userId,
      type: 'data_purchase',
      amount: pkg.amount,
      description: `Data Purchase: ${pkg.name} (${pkg.balance}MB) for ${phoneNumber}`,
      status: 'success',
      reference: transactionRef,
      balanceBefore: previousBalance,
      balanceAfter: newBalance,
      metadata: {
        packageId,
        provider: pkg.provider,
        phoneNumber,
        dataAmount: pkg.balance
      }
    })
    await mainTransaction.save()

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

    // Check balance
    if (user.balance < pkg.amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' })
    }

    // Create transaction
    const transactionRef = `AIRTIME-${userId.toString().slice(-6)}-${Date.now()}`
    const previousBalance = user.balance

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

    // Deduct balance
    user.balance -= pkg.amount
    const newBalance = user.balance
    transaction.newBalance = newBalance
    transaction.status = 'success'
    transaction.completedAt = new Date()
    await transaction.save()
    await user.save()

    // Create main transaction record
    const mainTransaction = new Transaction({
      userId,
      type: 'airtime_purchase',
      amount: pkg.amount,
      description: `Airtime Purchase: ₦${pkg.balance} from ${pkg.provider} to ${phoneNumber}`,
      status: 'success',
      reference: transactionRef,
      balanceBefore: previousBalance,
      balanceAfter: newBalance,
      metadata: {
        packageId,
        provider: pkg.provider,
        phoneNumber,
        airtimeAmount: pkg.balance
      }
    })
    await mainTransaction.save()

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
