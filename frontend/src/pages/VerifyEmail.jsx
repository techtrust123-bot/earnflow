import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from '../utils/axios'
import { motion } from 'framer-motion'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

export default function VerifyEmail() {
  const { isDark } = useTheme()
  const [otp, setOtp] = useState('')
  const [resending, setResending] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const userId = new URLSearchParams(location.search).get('id')



  const handleOtp = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post('/auth/sendOtp', {}, { withCredentials: true })
      toast.success(response.data.message)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send code')
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post('/auth/verify', { otp })
      if (res.data.message) {
        toast.success(res.data.message)
      }
    
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP")
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      const res = await axios.post('/auth/resendOtp', { userId })
      if (res.data.message) {
        toast.success(res.data.message)
      }
    } catch (err) {
      toast.error("Failed to resend")
    } finally {
      setResending(false)
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
          <div className="text-center mb-6">
            <h1 className={`text-2xl sm:text-3xl font-bold transition-colors ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Verify Your Email</h1>
            <p className={`mt-2 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>We sent a 6-digit code to your email</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={`w-full text-center text-3xl sm:text-4xl font-mono tracking-widest py-4 rounded-xl border-2 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-500 focus:border-blue-400' : 'border-gray-200 focus:border-blue-500 outline-none bg-white text-gray-900'}`}
              required
            />

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition"
            >
              Verify Email
            </button>
          </form>

          <div className="text-center mt-4">
            <p className={`transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Didn't receive code?</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                onClick={handleResend}
                disabled={resending}
                className={`font-semibold hover:underline disabled:opacity-50 transition-colors ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>
              <button onClick={handleOtp} className={`text-sm hover:underline transition-colors ${isDark ? 'text-slate-500 hover:text-slate-400' : 'text-gray-500 hover:text-gray-700'}`}>Send new code</button>
            </div>
          </div>
        </motion.div>
      </Container>
    </div>
  )
}