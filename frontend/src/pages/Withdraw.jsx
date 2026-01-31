// src/pages/Withdraw.jsx
import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import axios from '../utils/axios'
import { motion } from 'framer-motion'
import Container from '../components/Container'
import { updateBalance } from '../features/auth/authSlice'
import { useTheme } from '../context/ThemeContext'

const MIN_WITHDRAW = 500

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Access Bank (Diamond)", code: "063" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank (FCMB)", code: "214" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "50211" },
  { name: "Opay", code: "999992" },
  { name: "Palmpay", code: "100004" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered Bank", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" }
].sort((a, b) => a.name.localeCompare(b.name))

export default function Withdraw() {
  const { balance = 0 } = useSelector(state => state.auth)
  const { isDark } = useTheme()
  const [amount, setAmount] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()

  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      verifyAccount()
    } else {
      setAccountName('')
    }
  }, [accountNumber, selectedBank])

  const verifyAccount = async () => {
    setVerifying(true)
    setAccountName('')

    const bank = NIGERIAN_BANKS.find(b => b.name === selectedBank)
    if (!bank) {
      setVerifying(false)
      return
    }

    try {
      const res = await axios.get('/verification/verify-account', {
        params: {
          account_number: accountNumber,
          bank_code: bank.code
        }
      })

      if (res.data.success) {
        setAccountName(res.data.account_name)
        toast.success(`Verified: ${res.data.account_name}`)
      } else {
        toast.error('Invalid account')
      }
    } catch (err) {
      setAccountName('')
      toast.error(err.response?.data?.message || 'Verification failed')
      console.error('Verification error:', err)
    } finally {
      setVerifying(false)
    }
  }

  const calcFee = (amt) => {
    const n = Number(amt) || 0
    // example fee: 1.5% with min 50
    return Math.max(50, Math.round(n * 0.015))
  }

  const handleQuickAmount = (val) => setAmount(String(val))

  const handleWithdraw = async (e) => {
    e.preventDefault()
    const nAmount = Number(amount)

    if (!nAmount || nAmount < MIN_WITHDRAW || nAmount > balance) {
      toast.error(`Invalid amount (min ₦${MIN_WITHDRAW})`)
      return
    }
    if (nAmount > balance) {
      toast.error('Insufficient balance')
      return
    }
    if (!selectedBank || accountNumber.length !== 10 || !accountName) {
      toast.error('Please verify account first')
      return
    }

    setLoading(true)
    try {
      const bank = NIGERIAN_BANKS.find(b => b.name === selectedBank)
      if (!bank) {
        toast.error('Select a valid bank')
        setLoading(false)
        return
      }

      const res = await axios.post('/withdraw/request', {
        amount: nAmount,
        bankCode: bank.code,
        accountNumber,
        accountName
      })

      const newBalance = res.data?.balance
      if (typeof newBalance === 'number') {
        dispatch(updateBalance(newBalance))
      }

      toast.success(res.data?.message || 'Withdrawal requested — processing within 24hrs')
      setAmount('')
      setAccountNumber('')
      setSelectedBank('')
      setAccountName('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen p-3 sm:p-4 md:p-6 ${isDark ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-b from-white via-sky-50 to-indigo-50'} transition-colors`}>
      <Container>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="md:col-span-2">
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} p-4 sm:p-6 rounded-2xl shadow-md transition-colors`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <div className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Available Balance</div>
                  <div className={`text-2xl sm:text-3xl font-extrabold ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>₦{balance.toLocaleString()}</div>
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-2 gap-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  {[1000, 2000, 5000, 10000].map(v => (
                    <button key={v} onClick={() => handleQuickAmount(v)} className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 rounded-lg text-xs sm:text-sm hover:bg-gray-200 text-center">₦{v.toLocaleString()}</button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <div className="sm:col-span-2">
                    <label className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Amount</label>
                    <div className="mt-1.5 sm:mt-2 relative">
                      <span className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-base sm:text-lg ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>₦</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`${MIN_WITHDRAW}.00`}
                        className={`w-full pl-8 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 rounded-xl border text-sm sm:text-base ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'border-gray-200 bg-gray-50 text-gray-900'} outline-none transition-colors`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Fee</label>
                    <div className={`mt-1.5 sm:mt-2 rounded-xl ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-800'} border py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base transition-colors`}>₦{calcFee(amount)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Bank</label>
                    <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)} className={`mt-1.5 sm:mt-2 w-full rounded-xl border text-sm sm:text-base py-2 sm:py-3 px-3 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-200 text-gray-900'} transition-colors`}>
                      <option value="">Choose bank</option>
                      {NIGERIAN_BANKS.map(b => <option key={b.code} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Account Number</label>
                    <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0123456789" className={`mt-1.5 sm:mt-2 w-full rounded-xl border text-sm sm:text-base py-2 sm:py-3 px-3 font-mono ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-200 text-gray-900'} transition-colors`} />
                  </div>
                </div>

                <div>
                  {verifying ? (
                    <div className={`flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${isDark ? 'text-blue-400' : 'text-blue-600'}`}> <div className="w-4 h-4 sm:w-5 sm:h-5 border-3 sm:border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/> <span>Verifying account...</span> </div>
                  ) : accountName ? (
                    <div className={`p-2.5 sm:p-3 rounded-lg text-sm sm:text-base ${isDark ? 'bg-emerald-900/30 border-emerald-800' : 'bg-green-50 border-green-100'} border transition-colors`}>
                      <div className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-green-700'}`}>Account Verified</div>
                      <div className={`${isDark ? 'text-emerald-300' : 'text-green-800'}`}>{accountName}</div>
                    </div>
                  ) : (accountNumber.length === 10 && selectedBank) ? (
                    <div className={`text-xs sm:text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>Invalid account details</div>
                  ) : null}
                </div>

                <div className="flex gap-2 sm:gap-3 pt-2">
                  <button type="submit" disabled={loading || verifying || !accountName || Number(amount) < MIN_WITHDRAW} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-2.5 sm:py-3 rounded-xl font-semibold disabled:opacity-60 text-sm sm:text-base">{loading ? 'Processing...' : 'Withdraw Now'}</button>
                </div>
              </form>
            </div>
          </div>

          <aside className={`${isDark ? 'bg-slate-800' : 'bg-white'} p-4 sm:p-6 rounded-2xl shadow-md md:sticky md:top-28 transition-colors`}>
            <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-slate-50' : 'text-gray-900'} mb-3`}>Withdrawal Info</h3>
            <ul className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} space-y-2`}>
              <li>Minimum: <strong>₦{MIN_WITHDRAW}</strong></li>
              <li>Fee: 1.5% (min ₦50)</li>
              <li>Processing: <strong>Within 24 hours</strong></li>
              <li>Verify your bank details carefully.</li>
            </ul>

            <div className="mt-4 sm:mt-6">
              <h4 className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-900'} mb-2`}>Need help?</h4>
              <a href="/support" className={`text-xs sm:text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Contact Support</a>
            </div>
          </aside>
        </div>
        </motion.div>
      </Container>
    </div>
  )
}