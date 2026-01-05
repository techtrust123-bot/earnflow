const { initiateTransfer, verifyAccount } = require('../services/paystack')
const User = require('../models/user')


exports.withdraw = async (req, res) => {
  const user = req.user
  let { amount, accountNumber, accountName, bankCode } = req.body

  amount = Number(amount)

  if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' })
  if (amount > user.balance) return res.status(400).json({ message: 'Insufficient balance' })

  // basic account number validation (Nigeria: 10 digits)
  if (!/^[0-9]{10}$/.test(String(accountNumber))) {
    return res.status(400).json({ message: 'Invalid account number format' })
  }

  if(amount < 500){
    return res.status(400).json({ message: 'Minimum withdrawal is ₦500' })
  }

  if(user.balance < amount){
    return res.status(400).json({ message: 'Insufficient balance' })
  }

  if (!bankCode) return res.status(400).json({ message: 'Missing bank code' })

  try {
    // if accountName not provided, verify with Monnify to fetch account name
    if (!accountName) {
      const verifyRes = await verifyAccount(accountNumber, bankCode)
      if (!verifyRes || !verifyRes.requestSuccessful) {
        return res.status(400).json({ message: 'Account verification failed' })
      }
      accountName = verifyRes.responseBody?.accountName
    }

    const reference = `WD-${Date.now()}-${user._id}`

    const result = await initiateTransfer({
      amount,
      accountNumber,
      accountName,
      bankCode,
      reference
    })

    if (!result || !result.requestSuccessful) {
      return res.status(400).json({ message: result?.responseMessage || 'Transfer failed' })
    }

    // Create a transaction record for the withdrawal
    try {
      const Transaction = require('../models/transaction')
      await Transaction.create({ user: user._id, type: 'debit', amount, description: `Withdrawal to ${accountName || accountNumber}`, status: result?.requestSuccessful ? 'pending' : 'failed', reference, related: null, relatedModel: 'Payment', meta: { transferResponse: result } })
    } catch (e) {
      console.warn('withdraw: could not create transaction record', e.message || e)
    }

    // Deduct balance AFTER successful request
    user.balance -= amount
    await user.save()

    return res.json({ success: true, message: 'Withdrawal processing', balance: user.balance })
  } catch (err) {
    console.error('Paystack withdraw error:', err.response?.data || err.message)
    return res.status(500).json({ message: 'Withdrawal failed' })
  }
}
