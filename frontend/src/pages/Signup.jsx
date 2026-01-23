
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../features/auth/authSlice'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from '../utils/axios'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

export default function Signup() {
  const formDatas={
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  };
  const [formData, setFormData] = useState(formDatas)
  const [loading, setLoading] = useState(false)
  const { isDark } = useTheme()

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const q = new URLSearchParams(location.search)
  const refParam = q.get('ref') || q.get('referral') || q.get('r')

  const handleChange = (e) => {
    const {name, value, type, checked} = e.target;
    console.log(name, type === 'checkbox' ? checked : value)
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value })
  }



  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.phoneNumber || !formData.password) {
      toast.error('Name, email, phone number and password are required')
      return
    }

    if (!formData.agreeTerms) {
      toast.error('You must agree to the Terms and Conditions to sign up')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match")
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const payload = { name: formData.name.trim(), email: formData.email.trim(), phoneNumber: formData.phoneNumber.trim(), password: formData.password }
      if (refParam) payload.ref = refParam
      console.debug('Signup payload', payload)
      const res = await axios.post('/auth/register', payload)
      console.log('signup response', res)
      toast.success(res.data.message)
      dispatch(loginSuccess({
        user: res.data.user,
        token: res.data.token,
        balance: res.data.balance || 0
      }))

      // If backend returned user id, pass it to verify page
      const userId = res.data?.user?._id || res.data?.user?.id
      if (userId) navigate(`/verify-email?id=${userId}`)
      else navigate('/verify-email')
    } catch (error) {
      console.error('signup error', error.response?.data || error.message)
      toast.error(error.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'} px-4 py-6 transition-colors`}>
      <Container>
        <div className={`max-w-md mx-auto ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'} p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full transition-colors`}>
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold mb-2 sm:mb-3 text-sm sm:text-base">E</div>
            <h2 className="text-xl sm:text-2xl font-bold">Create Your Account</h2>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Start earning in under 60 seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <label className="block">
              <span className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Full name</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
                required
                className={`mt-1 w-full px-3 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm sm:text-base ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} transition-colors`}
              />
            </label>

            <label className="block">
              <span className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className={`mt-1 w-full px-3 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm sm:text-base ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} transition-colors`}
              />
            </label>

            <label className="block">
              <span className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Phone Number</span>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="08012345678"
                required
                className={`mt-1 w-full px-3 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm sm:text-base ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} transition-colors`}
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <label className="block">
                <span className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Password</span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  required
                  minLength="6"
                  className={`mt-1 w-full px-3 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm sm:text-base ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} transition-colors`}
                />
              </label>

              <label className="block">
                <span className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Confirm</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                  className={`mt-1 w-full px-3 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm sm:text-base ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} transition-colors`}
                />
              </label>
            </div>

            <label className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border-2 text-xs sm:text-sm ${formData.agreeTerms ? (isDark ? 'bg-indigo-900/20 border-indigo-600' : 'bg-indigo-50 border-indigo-300') : (isDark ? 'bg-slate-800 border-slate-600' : 'bg-gray-50 border-gray-300')} transition-colors cursor-pointer`}>
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className={`mt-1 w-4 h-4 rounded cursor-pointer flex-shrink-0 ${isDark ? 'accent-indigo-500' : 'accent-indigo-600'}`}
              />
              <div className="flex-1">
                <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">
                    Terms and Conditions
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">
                    Privacy Policy
                  </Link>
                </span>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading || !formData.agreeTerms}
              className="w-full bg-indigo-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? 'Creating Account...' : 'Sign Up Free'}
            </button>
          </form>

          <p className={`text-center mt-4 sm:mt-6 text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 font-semibold hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </Container>
    </div>
  )
}