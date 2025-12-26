
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../features/auth/authSlice'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from '../utils/axios'
import Container from '../components/Container'

export default function Signup() {
  const formDatas={
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };
  const [formData, setFormData] = useState(formDatas)
  const [loading, setLoading] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const {name, value} = e.target;
    console.log(name,value)
    setFormData({ ...formData, [name]:value })
  }



  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Name, email and password are required')
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
      const payload = { name: formData.name.trim(), email: formData.email.trim(), password: formData.password }
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Container>
        <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full sm:w-auto mx-2 sm:mx-auto">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-600 text-white font-bold mb-3">E</div>
            <h2 className="text-2xl font-bold">Create Your Account</h2>
            <p className="text-sm text-gray-500">Start earning in under 60 seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-gray-600">Full name</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
                required
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600">Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-gray-600">Password</span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  required
                  minLength="6"
                  className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">Confirm</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                  className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-teal-700 transition disabled:opacity-70"
            >
              {loading ? 'Creating Account...' : 'Sign Up Free'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-600">
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