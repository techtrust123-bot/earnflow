import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../features/auth/authSlice'
import { useNavigate, } from 'react-router-dom'
import { Link } from 'react-router-dom'
import axios from '../utils/axios'
import toast from 'react-hot-toast'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isDark } = useTheme()




 

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('/auth/login', { email, password })
      dispatch(loginSuccess({ user: res.data.user, token: res.data.token, balance: res.data.balance }))
      toast.success(res.data.message)
      
      navigate('/dashboard')
    } catch (error) {
      console.log(error.message)
      toast.error(error.response?.data?.message)
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'} px-4 py-6 transition-colors`}>
      <Container>
        <div className={`max-w-md mx-auto ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'} p-4 sm:p-6 md:p-8 rounded-xl shadow-lg w-full transition-colors`}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold mb-3 text-sm sm:text-base">E</div>
            <h2 className="text-xl sm:text-2xl font-bold">Welcome Back</h2>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Sign in to continue earning</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <label className="block">
              <span className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Email</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@domain.com" required
                className={`mt-1 w-full px-3 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} transition-colors`} />
            </label>

            <label className="block">
              <span className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Password</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                className={`mt-1 w-full px-3 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} transition-colors`} />
            </label>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <Link to="/forgot-password" className="text-indigo-600 hover:underline">Forgot password?</Link>
              <div />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base">
              {loading ? 'Logging in...' : 'Login & Start Earning'}
            </button>
          </form>

          <div className={`mt-6 text-center text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Don't have an account? <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">Sign up</Link>
          </div>
        </div>
      </Container>
    </div>
  )
}