// src/pages/Withdraw.jsx
import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import axios from '../utils/axios'
import { motion } from 'framer-motion'
import Container from '../components/Container'
import { updateBalance } from '../features/auth/authSlice'

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
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-b from-white via-sky-50 to-indigo-50">
      <Container>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-2 sm:mx-0">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Available Balance</div>
                  <div className="text-3xl font-extrabold text-gray-900">₦{balance.toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <div className="grid grid-cols-2 sm:flex sm:gap-2 gap-2 w-full sm:w-auto">
                    {[1000, 2000, 5000, 10000].map(v => (
                      <button key={v} onClick={() => handleQuickAmount(v)} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 w-full sm:w-auto text-center">₦{v.toLocaleString()}</button>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-sm text-gray-600">Amount</label>
                    <div className="mt-2 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-700">₦</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`${MIN_WITHDRAW}.00`}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-lg outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Fee</label>
                    <div className="mt-2 rounded-xl bg-gray-50 border border-gray-200 py-3 px-4 text-lg text-gray-800">₦{calcFee(amount)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Bank</label>
                    <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white py-3 px-3">
                      <option value="">Choose bank</option>
                      {NIGERIAN_BANKS.map(b => <option key={b.code} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Account Number</label>
                    <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0123456789" className="mt-2 w-full rounded-xl border border-gray-200 bg-white py-3 px-3 font-mono" />
                  </div>
                </div>

                <div>
                  {verifying ? (
                    <div className="flex items-center gap-3 text-blue-600"> <div className="w-5 h-5 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/> <span>Verifying account...</span> </div>
                  ) : accountName ? (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                      <div className="text-sm text-green-700 font-semibold">Account Verified</div>
                      <div className="text-lg text-green-800">{accountName}</div>
                    </div>
                  ) : (accountNumber.length === 10 && selectedBank) ? (
                    <div className="text-sm text-red-600">Invalid account details</div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button type="submit" disabled={loading || verifying || !accountName || Number(amount) < MIN_WITHDRAW} className="w-full sm:w-auto flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-xl font-semibold disabled:opacity-60">{loading ? 'Processing...' : 'Withdraw Now'}</button>
                </div>
              </form>
            </div>
          </div>

          <aside className="bg-white p-6 rounded-2xl shadow-md md:sticky md:top-28">
            <h3 className="text-lg font-bold mb-3">Withdrawal Info</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>Minimum withdrawal: <strong>₦{MIN_WITHDRAW}</strong></li>
              <li>Fee: 1.5% (min ₦50)</li>
              <li>Processing time: <strong>Within 24 hours</strong></li>
              <li>Make sure your bank details are correct to avoid delays.</li>
            </ul>

            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-2">Need help?</h4>
              <a href="/support" className="text-sm text-blue-600">Contact Support</a>
            </div>
          </aside>
        </div>
        </motion.div>
      </Container>
    </div>
  )
}