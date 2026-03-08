import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import axios from '../utils/axios'
import { useTheme } from '../context/ThemeContext'
import Container from '../components/Container'
import toast from 'react-hot-toast'
import { FaPhone,FaCogs,FaDatabase,FaCog, FaSignal, FaMobileAlt } from 'react-icons/fa'

export default function BuyDataAirtime() {
  const { user } = useSelector(state => state.auth)
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('data') // 'data' or 'airtime'
  const [dataPackages, setDataPackages] = useState([])
  const [airtimePackages, setAirtimePackages] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [pin, setPin] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState(null)
  const [phoneError, setPhoneError] = useState('')
  const [verifyingPhone, setVerifyingPhone] = useState(false)

  // Load packages and data on mount
  useEffect(() => {
    if (user?._id) {
      loadPackages()
      loadTransactions()
      loadStats()
    }
  }, [user, activeTab])

  // Validate phone number when it changes
  useEffect(() => {
    if (phoneNumber) {
      validatePhoneNumber(phoneNumber)
    } else {
      setPhoneError('')
    }
  }, [phoneNumber])

  const validatePhoneNumber = (number) => {
    // Remove any non-digit characters
    const cleanNumber = number.replace(/\D/g, '')
    
    // Nigerian phone number patterns
    const patterns = {
      mtn: /^(\+234|234|0)(703|706|803|806|810|813|814|816|903|906|913|916|703|704|706|803|806|810|813|814|816|903|906|913|916)/,
      airtel: /^(\+234|234|0)(701|708|802|808|812|901|902|904|907|912)/,
      glo: /^(\+234|234|0)(705|805|807|811|815|905|915)/,
      etisalat: /^(\+234|234|0)(809|817|818|909|908)/
    }

    if (cleanNumber.length < 11) {
      setPhoneError('Phone number must be at least 11 digits')
      return false
    }

    if (cleanNumber.length > 11 && !cleanNumber.startsWith('234') && !cleanNumber.startsWith('+234')) {
      setPhoneError('Phone number is too long')
      return false
    }

    // Check if it matches any network
    let network = null
    for (const [net, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleanNumber)) {
        network = net
        break
      }
    }

    if (!network) {
      setPhoneError('Invalid phone number or unsupported network')
      return false
    }

    setPhoneError('')
    return true
  }

  const formatPhoneNumber = (number) => {
    const cleanNumber = number.replace(/\D/g, '')
    if (cleanNumber.startsWith('234')) {
      return '0' + cleanNumber.slice(3)
    }
    if (cleanNumber.startsWith('+234')) {
      return '0' + cleanNumber.slice(4)
    }
    return cleanNumber
  }

  const loadPackages = async () => {
    try {
      setLoading(true)
      if (activeTab === 'data') {
        const res = await axios.get('/data-airtime/packages/data')
        if (res.data.success) {
          setDataPackages(res.data.packages)
        }
      } else {
        const res = await axios.get('/data-airtime/packages/airtime')
        if (res.data.success) {
          setAirtimePackages(res.data.packages)
        }
      }
    } catch (err) {
      console.error('Error loading packages:', err)
      toast.error('Failed to load packages')
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      const res = await axios.get(`/data-airtime/transactions/history?type=${activeTab}&limit=5`)
      if (res.data.success) {
        setTransactions(res.data.transactions)
      }
    } catch (err) {
      console.warn('Could not load transaction history')
    }
  }

  const loadStats = async () => {
    try {
      const res = await axios.get('/data-airtime/stats')
      if (res.data.success) {
        setStats(res.data.stats)
      }
    } catch (err) {
      console.warn('Could not load stats')
    }
  }

  const handlePurchase = async () => {
    if (!selectedPackage) {
      toast.error('Please select a package')
      return
    }
    if (!phoneNumber.trim()) {
      toast.error('Please enter phone number')
      return
    }
    if (!validatePhoneNumber(phoneNumber)) {
      toast.error(phoneError || 'Invalid phone number')
      return
    }
    if (!pin.trim()) {
      toast.error('Please enter your transaction PIN')
      return
    }

    setPurchasing(true)
    try {
      // First, verify the PIN
      const pinVerifyRes = await axios.post('/auth/verify-pin', { pin })
      if (!pinVerifyRes.data.success) {
        toast.error('Invalid PIN. Transaction cancelled.')
        setPurchasing(false)
        return
      }

      toast.success('PIN verified ✓')

      // Format phone number for API
      const formattedPhone = formatPhoneNumber(phoneNumber)

      // Then proceed with the purchase
      const endpoint = activeTab === 'data' 
        ? '/data-airtime/buy/data' 
        : '/data-airtime/buy/airtime'
      
      const res = await axios.post(endpoint, {
        packageId: selectedPackage._id,
        phoneNumber: formattedPhone,
        pin
      })

      if (res.data.success) {
        toast.success(res.data.message)
        setPhoneNumber('')
        setPin('')
        setSelectedPackage(null)
        loadTransactions()
        loadStats()
        // Refresh user balance
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed')
    } finally {
      setPurchasing(false)
    }
  }

  const packages = activeTab === 'data' ? dataPackages : airtimePackages

  return (
    <Container className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <h1 className={`text-3xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
          💳 Buy Data & Airtime
        </h1>
        <p className={`transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Purchase data and airtime directly with your Earnflow balance
        </p>
      </div>

      {/* Balance Card */}
      <div className={`rounded-lg p-6 transition-colors ${isDark ? 'bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'}`}>
        <p className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Current Balance</p>
        <p className={`text-4xl font-bold mt-2 transition-colors ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
          ₦{user?.balance?.toLocaleString() || '0.00'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setActiveTab('data')
            setSelectedPackage(null)
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
            activeTab === 'data'
              ? isDark
                ? 'bg-cyan-600 text-white'
                : 'bg-blue-600 text-white'
              : isDark
              ? 'bg-slate-700 text-slate-300'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          <FaSignal className="inline-block mr-2" />
          Buy Data
        </button>
        <button
          onClick={() => {
            setActiveTab('airtime')
            setSelectedPackage(null)
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
            activeTab === 'airtime'
              ? isDark
                ? 'bg-cyan-600 text-white'
                : 'bg-blue-600 text-white'
              : isDark
              ? 'bg-slate-700 text-slate-300'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          <FaPhone className="inline-block mr-2" />
           Buy Airtime
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Packages Grid */}
          <div>
            <h2 className={`text-lg font-bold mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
              Available {activeTab === 'data' ? 'Data' : 'Airtime'} Packages
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className={`inline-block animate-spin ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                  <FaCog className="text-4xl" />
                  ⚙️
                </div>
                <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Loading packages...</p>
              </div>
            ) : packages.length === 0 ? (
              <div className={`text-center py-12 rounded-lg transition-colors ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>No packages available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {packages.map((pkg) => (
                  <button
                    key={pkg._id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPackage?._id === pkg._id
                        ? isDark
                          ? 'border-cyan-500 bg-slate-700'
                          : 'border-blue-500 bg-blue-50'
                        : isDark
                        ? 'border-slate-600 bg-slate-800 hover:border-slate-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                      {pkg.provider}
                    </p>
                    <p className={`text-2xl font-bold my-2 transition-colors ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                      {activeTab === 'data' ? `${pkg.balance}MB` : `₦${pkg.balance}`}
                    </p>
                    <p className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      ₦{pkg.amount}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Purchase Form */}
          {selectedPackage && (
            <div className={`rounded-lg p-6 space-y-4 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-lg font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                Complete Purchase
              </h3>

              {/* Selected Package Summary */}
              <div className={`rounded-lg p-4 space-y-2 transition-colors ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Package:</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Amount:</span>
                  <span className={`font-semibold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>₦{selectedPackage.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>You Get:</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                    {activeTab === 'data' ? `${selectedPackage.balance}MB` : `₦${selectedPackage.balance}`}
                  </span>
                </div>
              </div>

              {/* Phone Number Input */}
              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number (e.g., 08012345678)"
                    maxLength={11}
                    className={`w-full px-4 py-2 pr-10 rounded-lg border transition-colors ${
                      phoneError
                        ? 'border-red-500 focus:ring-red-500 bg-red-50 text-red-900'
                        : phoneNumber && !phoneError
                        ? 'border-green-500 focus:ring-green-500 bg-green-50 text-green-900'
                        : isDark
                        ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-500 focus:ring-cyan-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                    } focus:outline-none focus:ring-2`}
                  />
                  {phoneNumber && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {phoneError ? (
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
                {phoneError && (
                  <p className="text-red-500 text-sm mt-1">{phoneError}</p>
                )}
                {phoneNumber && !phoneError && (
                  <p className="text-green-500 text-sm mt-1">✓ Valid phone number</p>
                )}
              </div>

              {/* PIN Input */}
              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Transaction PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your 4-digit PIN"
                  maxLength="6"
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-500'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-cyan-500' : 'focus:ring-blue-500'}`}
                />
                <p className={`text-xs mt-1 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  ⚠️ Your PIN is required to confirm purchases
                </p>
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  purchasing
                    ? isDark
                      ? 'bg-slate-600 text-slate-400'
                      : 'bg-gray-300 text-gray-500'
                    : isDark
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {purchasing ? '⏳ Processing...' : `✓ Confirm Purchase`}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Stats & History */}
        <div className="space-y-6">
          {/* Quick Stats */}
          {stats && (
            <div className={`rounded-lg p-4 space-y-3 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
              <h3 className={`font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                {activeTab === 'data' ? '📊 Data Stats' : '📊 Airtime Stats'}
              </h3>

              {activeTab === 'data' ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Total Spent</span>
                      <span className={`font-semibold ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                        ₦{stats.totalDataSpent?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Data Bought</span>
                      <span className={`font-semibold ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                        {stats.totalDataBought}MB
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Purchases</span>
                      <span className={`font-semibold ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                        {stats.dataTransactionCount}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Total Spent</span>
                      <span className={`font-semibold ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                        ₦{stats.totalAirtimeSpent?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Airtime Bought</span>
                      <span className={`font-semibold ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                        ₦{stats.totalAirtimeBought?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>Purchases</span>
                      <span className={`font-semibold ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                        {stats.airtimeTransactionCount}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Recent Transactions */}
          <div className={`rounded-lg p-4 space-y-3 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
              Recent Transactions
            </h3>

            {transactions.length === 0 ? (
              <p className={`text-sm text-center py-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                No transactions yet
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((tx, idx) => (
                  <div key={idx} className={`p-3 rounded-lg text-sm transition-colors ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className={`font-semibold ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                        {tx.provider}
                      </p>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        tx.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : tx.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </div>
                    <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      ₦{tx.amount} {activeTab === 'data' ? `(${tx.balance}MB)` : `(₦${tx.balance})`}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}
