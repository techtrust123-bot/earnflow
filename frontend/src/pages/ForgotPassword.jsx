import { useState } from 'react'
import toast from 'react-hot-toast'
import axios from '../utils/axios'
import { useNavigate } from 'react-router-dom'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

export default function ForgotPassword() {
  const { isDark } = useTheme()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [resending, setResending] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setResending(true)
    try {
      const res = await axios.post('/auth/sendReset', { email })
      if (res.data?.success) {
        setSent(true)
        toast.success(res.data.message || 'Reset code sent')
      }
      // navigate user to reset page with email prefilled
      navigate(`/reset-password?email=${encodeURIComponent(email)}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset code')
    } finally {
      setResending(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      const res = await axios.post('/auth/resend-reset-otp', { email })
      if (res.data?.success) {
        toast.success('New code sent!')
      }
    } catch (err) {
      toast.error('Failed to resend')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <Container>
        <div className={`rounded-3xl shadow-md p-6 sm:p-8 w-full max-w-md transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
          <h1 className={`text-2xl sm:text-3xl font-bold text-center mb-4 transition-colors ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Forgot Password?</h1>
          <p className={`text-center mb-6 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Enter the email associated with your account</p>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`mt-1 w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400 focus:ring-blue-400' : 'border-gray-300 focus:ring-blue-400'}`}
                  required
                />
              </label>

              <button
                type="submit"
                disabled={resending}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-lg font-semibold disabled:opacity-70 hover:shadow-lg transition"
              >
                {resending ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className={`text-lg font-bold mb-2 transition-colors ${isDark ? 'text-emerald-400' : 'text-green-600'}`}>Code Sent!</p>
              <p className={`mb-4 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Check your email for the reset code</p>
              <div className="flex gap-3">
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className={`font-semibold hover:underline disabled:opacity-50 transition-colors ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  {resending ? 'Sending...' : 'Resend Code'}
                </button>
                <button
                  onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
                  className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Continue to Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}