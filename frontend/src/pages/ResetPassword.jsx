// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from '../utils/axios'
import { motion } from 'framer-motion'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

export default function ResetPassword() {
  const { isDark } = useTheme()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Get email from URL
  // const email = searchParams.get('email') || ''
  
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const e = searchParams.get('email')
    if (e) setEmail(e)
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email) {
      toast.error("Email missing. Go back to forgot password.")
      return
    }
    if (otp.length !== 6) {
      toast.error("Enter 6-digit OTP")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Password too short")
      return
    }

    setLoading(true)
    try {
      await axios.post('/auth/resetPassword', {
        email: email.trim(),
        otp,
        newPassword
      })

      toast.success('Password reset successful!')
      setTimeout(() => navigate('/login'), 1400)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <Container>
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-3xl shadow-md p-6 sm:p-8 w-full max-w-md transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}
        >
          <div className="text-center mb-4">
            <h1 className={`text-2xl sm:text-3xl font-bold transition-colors ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Reset Password</h1>
            <p className={`mt-1 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Enter the code sent to your email</p>
            {email && <div className={`text-sm font-mono mt-2 transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{email}</div>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={`w-full text-center text-3xl sm:text-4xl font-mono tracking-widest py-3 rounded-xl border-2 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-500 focus:border-blue-400' : 'border-gray-200 focus:border-blue-600 outline-none'}`}
              required
            />

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              className={`w-full px-3 py-2 rounded-lg border-2 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400 focus:border-blue-400' : 'border-gray-200 focus:border-blue-600 outline-none'}`}
              required
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className={`w-full px-3 py-2 rounded-lg border-2 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400 focus:border-blue-400' : 'border-gray-200 focus:border-blue-600 outline-none'}`}
              required
            />

            {!email && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={`w-full px-3 py-2 rounded-lg border-2 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400 focus:border-blue-400' : 'border-gray-200 focus:border-blue-600 outline-none'}`}
                required
              />
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-lg transition-all ${
                loading
                  ? (isDark ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-400 cursor-not-allowed')
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {loading ? 'Processing...' : 'Reset Password'}
            </motion.button>
          </form>

          <div className="text-center mt-4">
            <button onClick={() => navigate('/forgot-password')} className={`hover:underline font-medium transition-colors ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              Resend OTP
            </button>
          </div>
        </motion.div>
      </Container>
    </div>
  )
}