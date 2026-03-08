import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from '../utils/axios'
import { motion } from 'framer-motion'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

export default function VerifyDevice() {
  const { isDark } = useTheme()
  const [code, setCode] = useState('')
  const [resending, setResending] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Request verification code when component mounts
    requestVerification()
  }, [])

  const requestVerification = async () => {
    setResending(true)
    try {
      await axios.post('/api/devices/request-verification', {}, { withCredentials: true })
      toast.success('Verification code sent to your email')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send verification code')
    } finally {
      setResending(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!code.trim()) {
      toast.error('Please enter the verification code')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/api/devices/verify', { code }, { withCredentials: true })
      toast.success(response.data.message || 'Device verified successfully')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto mt-20"
      >
        <div className={`p-8 rounded-lg shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-2xl font-bold text-center mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Verify Your Device
          </h2>
          <p className={`text-center mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            We've sent a verification code to your email. Please enter it below to verify this device.
          </p>

          <form onSubmit={handleVerify}>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter 6-digit code"
                maxLength="6"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Verifying...' : 'Verify Device'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={requestVerification}
              disabled={resending}
              className={`text-sm ${
                resending
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        </div>
      </motion.div>
    </Container>
  )
}