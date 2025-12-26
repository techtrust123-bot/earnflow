import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from '../utils/axios'
import { motion } from 'framer-motion'
import Container from '../components/Container'

export default function VerifyEmail() {
  const [otp, setOtp] = useState('')
  const [resending, setResending] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const userId = new URLSearchParams(location.search).get('id')



  const handleOtp = async (e) => {
    e?.preventDefault()
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Container>
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-md p-6 sm:p-8 w-full max-w-md"
        >
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">Verify Your Email</h1>
            <p className="text-gray-600 mt-2">We sent a 6-digit code to your email</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-3xl sm:text-4xl font-mono tracking-widest py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none"
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
            <p className="text-gray-600">Didn't receive code?</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-blue-600 font-semibold hover:underline disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>
              <button onClick={handleOtp} className="text-sm text-gray-500 hover:underline">Send new code</button>
            </div>
          </div>
        </motion.div>
      </Container>
    </div>
  )
}