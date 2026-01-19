import { useState } from 'react'
import { useSelector } from 'react-redux'
import axios from '../utils/axios'
import { useTheme } from '../context/ThemeContext'
import Container from '../components/Container'
import toast from 'react-hot-toast'

export default function SetTransactionPin() {
  const { user } = useSelector(state => state.auth)
  const { isDark } = useTheme()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSetPin = async (e) => {
    e.preventDefault()

    if (!pin || !confirmPin) {
      toast.error('Please enter PIN in both fields')
      return
    }

    if (pin.length < 4) {
      toast.error('PIN must be at least 4 digits')
      return
    }

    if (pin !== confirmPin) {
      toast.error('PINs do not match')
      return
    }

    if (!/^\d+$/.test(pin)) {
      toast.error('PIN must contain only numbers')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('/auth/set-pin', {
        pin
      })

      if (res.data.success) {
        toast.success('Transaction PIN set successfully!')
        setPin('')
        setConfirmPin('')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="p-4 space-y-6 pb-20 max-w-md mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className={`text-3xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
          🔐 Transaction PIN
        </h1>
        <p className={`transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Set a secure PIN to protect your transactions
        </p>
      </div>

      {/* Info Box */}
      <div className={`rounded-lg p-4 space-y-2 transition-colors ${isDark ? 'bg-blue-900/20 border border-blue-700/50' : 'bg-blue-50 border border-blue-200'}`}>
        <p className={`text-sm font-semibold transition-colors ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>
          📌 Why a PIN?
        </p>
        <ul className={`text-sm space-y-1 transition-colors ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
          <li>✓ Adds extra security to transactions</li>
          <li>✓ Required for data/airtime purchases</li>
          <li>✓ Required for withdrawals</li>
          <li>✓ Only you know it</li>
        </ul>
      </div>

      {/* Form */}
      <form onSubmit={handleSetPin} className="space-y-4">
        {/* PIN Input */}
        <div>
          <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            Enter PIN (4+ digits)
          </label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              maxLength="6"
              placeholder="••••"
              className={`w-full px-4 py-3 rounded-lg border text-2xl tracking-widest text-center transition-colors ${
                isDark
                  ? 'bg-slate-700 border-slate-600 text-slate-50'
                  : 'bg-white border-gray-300'
              } focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-cyan-500' : 'focus:ring-blue-500'}`}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}
            >
              {showPin ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <p className={`text-xs mt-1 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            {pin.length > 0 && `${pin.length} digits`}
          </p>
        </div>

        {/* Confirm PIN Input */}
        <div>
          <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            Confirm PIN
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              inputMode="numeric"
              maxLength="6"
              placeholder="••••"
              className={`w-full px-4 py-3 rounded-lg border text-2xl tracking-widest text-center transition-colors ${
                isDark
                  ? 'bg-slate-700 border-slate-600 text-slate-50'
                  : 'bg-white border-gray-300'
              } focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-cyan-500' : 'focus:ring-blue-500'}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}
            >
              {showConfirm ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {confirmPin.length > 0 && pin !== confirmPin && (
            <p className="text-xs mt-1 text-red-600">PINs do not match</p>
          )}
        </div>

        {/* Set PIN Button */}
        <button
          type="submit"
          disabled={loading || !pin || !confirmPin}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            loading || !pin || !confirmPin
              ? isDark
                ? 'bg-slate-600 text-slate-400'
                : 'bg-gray-300 text-gray-500'
              : isDark
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? '⏳ Setting PIN...' : '✓ Set Transaction PIN'}
        </button>
      </form>

      {/* Security Tips */}
      <div className={`rounded-lg p-4 space-y-2 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-gray-100 border border-gray-200'}`}>
        <p className={`text-sm font-semibold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
          🛡️ Security Tips
        </p>
        <ul className={`text-xs space-y-1 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          <li>• Use a PIN only YOU know</li>
          <li>• Don't share it with anyone</li>
          <li>• Use mix of numbers for security</li>
          <li>• We'll never ask for your PIN by email/call</li>
        </ul>
      </div>
    </Container>
  )
}
