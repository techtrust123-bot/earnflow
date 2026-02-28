import React, { useState, useEffect } from 'react'
import axios from '../utils/axios'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../features/auth/authSlice'

const Wallet = () => {
  const { isDark } = useTheme()
  const dispatch = useDispatch()
  const [balance, setBalance] = useState(0)
  const [userBalance, setUserBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [fundingAmount, setFundingAmount] = useState('')
  const [fundingEmail, setFundingEmail] = useState('')
  const [showFundModal, setShowFundModal] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  const [showDataAirtimeModal, setShowDataAirtimeModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [dataPackages, setDataPackages] = useState([])
  const [airtimePackages, setAirtimePackages] = useState([])
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [transactionPin, setTransactionPin] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('wallet') // 'wallet' or 'balance'

  useEffect(() => {
    fetchWalletData()
  }, [])

  const fetchWalletData = async () => {
    try {
      setLoading(true)
      const [balanceRes, transactionsRes, userRes] = await Promise.all([
        axios.get('/wallet/balance'),
        axios.get('/wallet/transactions'),
        axios.get('/auth/profile')
      ])

      if (balanceRes.data.success) {
        setBalance(balanceRes.data.balance)
      }

      if (transactionsRes.data.success) {
        setTransactions(transactionsRes.data.transactions)
      }

      if (userRes.data.success) {
        setUserBalance(userRes.data.user.balance || 0)
        // update global auth state in case it was lost on refresh
        dispatch(loginSuccess({ user: userRes.data.user, token: null, balance: userRes.data.balance }))
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
      toast.error('Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }

  const handleFundWallet = async (e) => {
    e.preventDefault()

    if (!fundingAmount || fundingAmount < 100) {
      toast.error('Minimum funding amount is ₦100')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post('/wallet/fund', {
        amount: parseFloat(fundingAmount),
        email: fundingEmail
      })

      if (response.data.success) {
        const ref = response.data.reference || (response.data.data && response.data.data.reference)
        const authUrl = response.data.authorization_url || (response.data.data && response.data.data.authorization_url)

        // Prefer inline popup when Paystack inline JS is available
        if (window.PaystackPop && typeof window.PaystackPop.setup === 'function' && (process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || (response.data.data && response.data.data.public_key))) {
          const key = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || (response.data.data && response.data.data.public_key)
          const email = fundingEmail || ''
          try {
            const handler = window.PaystackPop.setup({
              key,
              email,
              ref: ref,
              onClose: function(){ toast('Payment closed') },
              callback: async function(resp){
                // Verify with backend and refresh wallet
                try {
                  const verifyResp = await axios.get(`/wallet/verify/${resp.reference}`)
                  if (verifyResp.data && verifyResp.data.success) {
                    toast.success('Wallet funded successfully')
                    fetchWalletData()
                  } else {
                    toast.error(verifyResp.data?.message || 'Verification failed')
                  }
                } catch (err) {
                  console.error('Verify error', err)
                  toast.error('Payment verification failed')
                }
              }
            })
            try { handler.openIframe() } catch (e) { console.warn(e); if (authUrl) window.location.href = authUrl }
          } catch (e) {
            console.warn('Paystack popup failed', e)
            if (authUrl) window.location.href = authUrl
            else toast.error('Payment initialization failed')
          }
        } else if (authUrl) {
          // Fallback to hosted page
          window.location.href = authUrl
        } else {
          toast.error(response.data.message || 'Failed to initialize payment')
        }
      } else {
        toast.error(response.data.message || 'Failed to initialize payment')
      }
    } catch (error) {
      console.error('Error funding wallet:', error)
      toast.error('Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit':
        return '💰'
      case 'debit':
        return '💸'
      default:
        return '💳'
    }
  }

  const getTransactionColor = (type) => {
    return type === 'credit' ? 'text-green-600' : 'text-red-600'
  }

  const toggleBalanceVisibility = () => {
    setShowBalance(!showBalance)
  }

  const fetchDataPackages = async () => {
    try {
      const response = await axios.get('/data-airtime/packages/data')
      if (response.data.success) {
        setDataPackages(response.data.packages)
      }
    } catch (error) {
      console.error('Error fetching data packages:', error)
      toast.error('Failed to load data packages')
    }
  }

  const fetchAirtimePackages = async () => {
    try {
      const response = await axios.get('/data-airtime/packages/airtime')
      if (response.data.success) {
        setAirtimePackages(response.data.packages)
      }
    } catch (error) {
      console.error('Error fetching airtime packages:', error)
      toast.error('Failed to load airtime packages')
    }
  }

  const handleDataAirtimePurchase = async (e) => {
    e.preventDefault()

    if (!selectedPackage || !phoneNumber || !transactionPin) {
      toast.error('Please fill all required fields')
      return
    }

    if (!/^[0-9]{11}$/.test(phoneNumber)) {
      toast.error('Please enter a valid 11-digit phone number')
      return
    }

    try {
      setLoading(true)

      const response = await axios.post('/data-airtime/buy/data', {
        packageId: selectedPackage._id,
        phoneNumber,
        pin: transactionPin,
        paymentMethod // This will be 'wallet' or 'balance'
      })

      if (response.data.success) {
        toast.success('Data purchase successful!')
        setShowDataAirtimeModal(false)
        setSelectedPackage(null)
        setPhoneNumber('')
        setTransactionPin('')
        fetchWalletData() // Refresh balances
      } else {
        toast.error(response.data.message || 'Purchase failed')
      }
    } catch (error) {
      console.error('Error purchasing data:', error)
      toast.error(error.response?.data?.message || 'Purchase failed')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()

    if (!withdrawAmount || !accountNumber || !bankCode) {
      toast.error('Please fill all required fields')
      return
    }

    const amount = parseFloat(withdrawAmount)
    if (amount < 500) {
      toast.error('Minimum withdrawal is ₦500')
      return
    }

    // Check balance based on payment method
    const availableBalance = paymentMethod === 'wallet' ? balance : userBalance
    if (amount > availableBalance) {
      toast.error(`Insufficient ${paymentMethod} balance`)
      return
    }

    try {
      setLoading(true)

      const response = await axios.post('/withdraw/request', {
        amount,
        accountNumber,
        accountName,
        bankCode,
        paymentMethod // This will be 'wallet' or 'balance'
      })

      if (response.success !== false) {
        toast.success('Withdrawal request submitted successfully!')
        setShowWithdrawModal(false)
        setWithdrawAmount('')
        setAccountNumber('')
        setAccountName('')
        setBankCode('')
        fetchWalletData() // Refresh balances
      } else {
        toast.error(response.message || 'Withdrawal failed')
      }
    } catch (error) {
      console.error('Error withdrawing:', error)
      toast.error(error.response?.data?.message || 'Withdrawal failed')
    } finally {
      setLoading(false)
    }
  }

  const openDataAirtimeModal = async () => {
    setShowDataAirtimeModal(true)
    await fetchDataPackages()
  }

  const openWithdrawModal = () => {
    setShowWithdrawModal(true)
  }

  return (
    <div className={`min-h-screen py-4 sm:py-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Wallet</h1>
          <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Manage your funds and view transaction history</p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Wallet Balance Card */}
          <div className={`rounded-lg shadow-md p-4 sm:p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 mb-4 sm:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-lg sm:text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Wallet Balance</h2>
                  <button
                    onClick={toggleBalanceVisibility}
                    className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    aria-label={showBalance ? "Hide balance" : "Show balance"}
                  >
                    {showBalance ? (
                      <svg className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {showBalance ? formatCurrency(balance) : '₦••••••'}
                </p>
              </div>
              <div className="sm:ml-4">
                <button
                  onClick={() => setShowFundModal(true)}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Fund Wallet
                </button>
              </div>
            </div>
          </div>

          {/* User Balance Card */}
          <div className={`rounded-lg shadow-md p-4 sm:p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 mb-4 sm:mb-0">
                <h2 className={`text-lg sm:text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Account Balance</h2>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-2">
                  {showBalance ? formatCurrency(userBalance) : '₦••••••'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:ml-4">
                <button
                  onClick={openDataAirtimeModal}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  Buy Data/Airtime
                </button>
                <button
                  onClick={openWithdrawModal}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className={`rounded-lg shadow-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`px-4 sm:px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg sm:text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Transaction History</h2>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction._id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg ${isDark ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-2 sm:mb-0">
                      <div className="text-xl sm:text-2xl">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{transaction.description}</p>
                        <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(transaction.createdAt)} • {transaction.reference}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-left sm:text-right">
                      <p className={`font-semibold text-sm sm:text-base ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <p className={`text-xs sm:text-sm ${transaction.status === 'successful' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fund Wallet Modal */}
      {showFundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md mx-auto rounded-lg p-4 sm:p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Fund Wallet</h3>

            <form onSubmit={handleFundWallet}>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Amount (₦)
                </label>
                <input
                  type="number"
                  value={fundingAmount}
                  onChange={(e) => setFundingAmount(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  placeholder="Enter amount"
                  min="100"
                  required
                />
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Minimum: ₦100</p>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={fundingEmail}
                  onChange={(e) => setFundingEmail(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  placeholder="Enter email for receipt"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowFundModal(false)}
                  className={`flex-1 px-4 py-2 border rounded-md transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Fund Wallet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data/Airtime Purchase Modal */}
      {showDataAirtimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl mx-auto rounded-lg p-4 sm:p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
            <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Buy Data/Airtime</h3>

            <form onSubmit={handleDataAirtimePurchase}>
              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Payment Method
                </label>
                <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <span className={`text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Wallet Balance: {formatCurrency(balance)}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="balance"
                      checked={paymentMethod === 'balance'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <span className={`text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Account Balance: {formatCurrency(userBalance)}
                    </span>
                  </label>
                </div>
              </div>

              {/* Phone Number */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  placeholder="Enter 11-digit phone number"
                  maxLength="11"
                  required
                />
              </div>

              {/* Transaction PIN */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Transaction PIN
                </label>
                <input
                  type="password"
                  value={transactionPin}
                  onChange={(e) => setTransactionPin(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  placeholder="Enter your transaction PIN"
                  maxLength="4"
                  required
                />
              </div>

              {/* Data Packages */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Select Data Package
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {dataPackages.map((pkg) => (
                    <div
                      key={pkg._id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPackage?._id === pkg._id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : isDark
                            ? 'border-gray-600 hover:bg-gray-700'
                            : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</p>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{pkg.balance}MB</p>
                        </div>
                        <p className="font-bold text-green-600 ml-2">{formatCurrency(pkg.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowDataAirtimeModal(false)}
                  className={`flex-1 px-4 py-2 border rounded-md transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedPackage}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 text-sm sm:text-base"
                >
                  {loading ? 'Processing...' : `Buy Data - ${selectedPackage ? formatCurrency(selectedPackage.amount) : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md mx-auto rounded-lg p-4 sm:p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Withdraw Funds</h3>

            <form onSubmit={handleWithdraw}>
              {/* Payment Method Selection */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Withdraw From
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <span className={`text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Wallet: {formatCurrency(balance)}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="balance"
                      checked={paymentMethod === 'balance'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <span className={`text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Account: {formatCurrency(userBalance)}
                    </span>
                  </label>
                </div>
              </div>

              {/* Amount */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Amount (₦)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  placeholder="Enter amount"
                  min="500"
                  required
                />
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Minimum: ₦500</p>
              </div>

              {/* Account Number */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  placeholder="10-digit account number"
                  maxLength="10"
                  required
                />
              </div>

              {/* Account Name */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Account Name (optional)
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  placeholder="Account holder name"
                />
              </div>

              {/* Bank Code */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Bank Code
                </label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  required
                >
                  <option value="">Select Bank</option>
                  <option value="044">Access Bank</option>
                  <option value="063">Diamond Bank</option>
                  <option value="050">Ecobank Nigeria</option>
                  <option value="084">Enterprise Bank</option>
                  <option value="070">Fidelity Bank</option>
                  <option value="011">First Bank of Nigeria</option>
                  <option value="214">First City Monument Bank</option>
                  <option value="058">Guaranty Trust Bank</option>
                  <option value="030">Heritage Bank</option>
                  <option value="301">Jaiz Bank</option>
                  <option value="082">Keystone Bank</option>
                  <option value="101">Providus Bank</option>
                  <option value="076">Polaris Bank</option>
                  <option value="068">Standard Chartered Bank</option>
                  <option value="232">Sterling Bank</option>
                  <option value="100">Suntrust Bank</option>
                  <option value="032">Union Bank of Nigeria</option>
                  <option value="033">United Bank for Africa</option>
                  <option value="215">Unity Bank</option>
                  <option value="035">Wema Bank</option>
                  <option value="057">Zenith Bank</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className={`flex-1 px-4 py-2 border rounded-md transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Wallet