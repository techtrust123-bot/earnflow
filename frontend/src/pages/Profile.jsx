// src/pages/Profile.jsx
import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { loginSuccess } from '../features/auth/authSlice'
import axios from '../utils/axios'
import { motion } from 'framer-motion'
import Container from '../components/Container'
import toast from 'react-hot-toast'
import API_URL from '../config/api'

export default function Profile() {
  const { user, balance } = useSelector(state => state.auth)
  const dispatch = useDispatch()

  const [loading, setLoading] = useState(false)

  const handleConnectTwitter = () => {
    window.location.href = `${API_URL}/twitter/auth`
  }

  const handleUnlinkTwitter = async () => {
    setLoading(true)
    try {
      const res = await axios.delete('/twitter/unlink')
      if (res.data.success) {
        toast.success(res.data.message || 'Twitter unlinked')
        const { data } = await axios.get('/auth/me')
        if (data?.user) dispatch(loginSuccess({ user: data.user, token: null, balance: data.balance }))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlink Twitter')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const twitterLinked = params.get('twitter') === 'linked'

    const refreshUser = async () => {
      try {
        const { data } = await axios.get('/auth/me')
        if (data?.user) dispatch(loginSuccess({ user: data.user, token: null, balance: data.balance }))
      } catch (err) {
        // ignore
      }
    }

    if (twitterLinked) {
      toast.success('Twitter linked')
      params.delete('twitter')
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '')
      window.history.replaceState({}, '', newUrl)
      refreshUser()
    } else {
      refreshUser()
    }
  }, [dispatch])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-sky-50 to-indigo-50 p-6">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-6 sm:p-8 mx-2 sm:mx-0">

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white mx-auto sm:mx-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <h2 className="text-2xl font-extrabold text-gray-800">{user?.name || 'Your Name'}</h2>
              {user?.role === 'admin' && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">Admin</span>
              )}
            </div>
            <p className="text-sm text-gray-500">{user?.email || 'No email provided'}</p>
            <div className="mt-3 flex items-center justify-center sm:justify-start gap-4">
              <div className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">Balance: ₦{(balance || 0).toLocaleString()}</div>
              <div className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">Role: {user?.role || 'user'}</div>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
            {user?.twitter?.username ? (
              <>
                <div className="text-sm text-gray-600">Connected: <span className="font-semibold">@{user.twitter.username}</span></div>
                <button onClick={handleUnlinkTwitter} disabled={loading} className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-full text-sm hover:bg-red-700">Unlink</button>
              </>
            ) : (
              <button onClick={handleConnectTwitter} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700">Connect Twitter</button>
            )}
          </div>
        </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">Tasks Completed</div>
            <div className="text-xl font-bold text-gray-800">{user?.tasksCompleted || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">Referrals</div>
            <div className="text-xl font-bold text-gray-800">{user?.referrals || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">Account Status</div>
            <div className="text-xl font-bold text-gray-800">{user?.accountStatus || 'Active'}</div>
          </div>
        </div>

        <div className="mt-6 text-center sm:text-right">
          <button onClick={() => window.location.href = '/tasks'} className="px-4 py-2 w-full sm:w-auto bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200">View Tasks</button>
        </div>
        </motion.div>
      </Container>
    </div>
  )
}

