// src/pages/Profile.jsx
import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { loginSuccess, logout } from '../features/auth/authSlice'
import axios from '../utils/axios'
import { motion } from 'framer-motion'
import Container from '../components/Container'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import API_URL from '../config/api'
import { useTheme } from '../context/ThemeContext'

export default function Profile() {
  const { user, balance } = useSelector(state => state.auth)
  const dispatch = useDispatch()
  const { isDark } = useTheme()

  const [loading, setLoading] = useState(false)
  const [showRetry, setShowRetry] = useState(false)
  const navigate = useNavigate()

  const handleConnectSocial = (platform) => {
    // Use OAuth2 connect endpoint for the platform
    const url = `${API_URL}/${platform.toLowerCase()}/oauth2/connect`
    const width = 600
    const height = 700
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2)
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2)

    // Try popup first; fallback to top-level navigation if blocked
    const popup = window.open(url, `${platform}Connect`, `width=${width},height=${height},left=${left},top=${top}`)
    if (!popup) {
      // popup blocked — navigate the main window
      window.location.href = url
      return
    }

    // Poll popup: when it becomes same-origin (redirected back to our site) or closes, refresh user
    const pollInterval = 500
    const poll = setInterval(async () => {
      try {
        if (popup.closed) {
          clearInterval(poll)
          try {
            const { data } = await axios.get('/auth/me')
            if (data?.user) dispatch(loginSuccess({ user: data.user, token: null, balance: data.balance }))
          } catch (e) {}
          return
        }

        // Once popup is redirected back to our origin we can safely read its location
        const href = popup.location && popup.location.href
        if (href && (href.includes('/profile') || href.includes(`?${platform.toLowerCase()}=`))) {
          popup.close()
          clearInterval(poll)
          try {
            const { data } = await axios.get('/auth/me')
            if (data?.user) dispatch(loginSuccess({ user: data.user, token: null, balance: data.balance }))
          } catch (e) {}
        }
      } catch (e) {
        // Cross-origin until redirect back to our site — ignore errors
      }
    }, pollInterval)
  }

  const handleConnectTwitter = () => {
    handleConnectSocial('twitter')
  }

  const handleUnlinkSocial = async (platform) => {
    setLoading(true)
    try {
      const res = await axios.delete(`/${platform.toLowerCase()}/unlink`)
      if (res.data.success) {
        toast.success(res.data.message || `${platform} unlinked`)
        const { data } = await axios.get('/auth/me')
        if (data?.user) dispatch(loginSuccess({ user: data.user, token: null, balance: data.balance }))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to unlink ${platform}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!window.confirm('Logout of your account?')) return
    setLoading(true)
    try {
      const res = await axios.post('/auth/logout')
      if (res.data.success) {
        toast.success(res.data.message || 'Logged out')
        dispatch(logout())
        navigate('/')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to logout')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const platforms = ['twitter', 'tiktok', 'instagram', 'facebook', 'youtube']
    
    let linkedPlatform = null
    let failedPlatform = null
    
    for (const platform of platforms) {
      const param = params.get(platform)
      if (typeof param === 'string' && param.startsWith('linked')) {
        linkedPlatform = platform
        break
      } else if (param === 'failed') {
        failedPlatform = platform
        break
      }
    }

    const refreshUser = async () => {
      try {
        const { data } = await axios.get('/auth/me')
        if (data?.user) dispatch(loginSuccess({ user: data.user, token: null, balance: data.balance }))
      } catch (err) {
        // ignore
      }
    }

    if (linkedPlatform) {
      toast.success(`${linkedPlatform.charAt(0).toUpperCase() + linkedPlatform.slice(1)} linked`)
      params.delete(linkedPlatform)
      params.delete('reason')
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '')
      window.history.replaceState({}, '', newUrl)
      refreshUser()
      setShowRetry(false)
    } else if (failedPlatform) {
      const failReason = params.get('reason')
      // map some reasons to friendly messages
      const map = {
        expired: 'OAuth session expired, please try connecting again',
        invalid_session: 'OAuth session invalid — please retry linking your account',
        missing_params: 'The platform returned invalid response. Please try again',
        server_error: 'Linking failed due to a server error. Please retry.'
      }
      const msg = map[failReason] || decodeURIComponent(failReason || `${failedPlatform} linking failed`)
      toast.error(msg)
      params.delete(failedPlatform)
      params.delete('reason')
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '')
      window.history.replaceState({}, '', newUrl)
      // refresh user (still helpful)
      refreshUser()
      // show retry option for common recoverable reasons
      if (['expired', 'invalid_session'].includes(failReason)) {
        setShowRetry(true)
      } else {
        setShowRetry(false)
      }
    } else {
      refreshUser()
    }
  }, [dispatch])

  // Listen for messages from the OAuth popup (immediate notification)
  useEffect(() => {
    const handlePopupMessage = async (e) => {
      try {
        // Accept messages from our frontend origin or from the API/backend origin
        const apiOrigin = (() => { try { return new URL(API_URL).origin } catch(e){ return null } })()
        if (e.origin !== window.location.origin && e.origin !== apiOrigin) return
        const data = e.data || {}
        const platforms = ['twitter', 'tiktok', 'instagram', 'facebook', 'youtube']
        
        let hasPlatformData = false
        for (const platform of platforms) {
          if (data[platform] || data.user) {
            hasPlatformData = true
            break
          }
        }
        
        if (!hasPlatformData) return

        for (const platform of platforms) {
          if (typeof data[platform] === 'string' && data[platform].startsWith('linked')) {
            toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} linked`)
            break
          } else if (data[platform] === 'failed') {
            toast.error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} linking failed`)
            break
          }
        }

        // If the popup included the user object, use it immediately; otherwise fetch
        if (data.user) {
          dispatch(loginSuccess({ user: data.user, token: null, balance: data.user.balance || 0 }))
        } else {
          try {
            const { data: res } = await axios.get('/auth/me')
            if (res?.user) dispatch(loginSuccess({ user: res.user, token: null, balance: res.balance }))
          } catch (err) {
            // ignore
          }
        }
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener('message', handlePopupMessage)
    return () => window.removeEventListener('message', handlePopupMessage)
  }, [dispatch])

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-b from-white via-sky-50 to-indigo-50'} p-6 transition-colors`}>
      {showRetry && (
        <div className={`max-w-3xl mx-auto mb-4 p-4 rounded-lg ${isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border flex items-center justify-between gap-4 transition-colors`}>
          <div className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-800'}`}>Account linking failed — you can retry connecting your account.</div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowRetry(false); handleConnectTwitter() }} className="px-3 py-2 bg-yellow-600 text-white rounded-full text-sm hover:bg-yellow-700">Retry Connect</button>
            <button onClick={() => setShowRetry(false)} className="px-3 py-2 bg-white border rounded-full text-sm">Dismiss</button>
          </div>
        </div>
      )}
      <Container size="md">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-xl p-6 sm:p-8 transition-colors`}>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white mx-auto sm:mx-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <h2 className={`text-2xl font-extrabold ${isDark ? 'text-slate-50' : 'text-gray-800'}`}>{user?.name || 'Your Name'}</h2>
              {user?.role === 'admin' && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">Admin</span>
              )}
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{user?.email || 'No email provided'}</p>
            <div className="mt-3 flex items-center justify-center sm:justify-start gap-4">
              <div className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-700'}`}>Balance: ₦{(balance || 0).toLocaleString()}</div>
              <div className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-700'}`}>Role: {user?.role || 'user'}</div>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
            <div className="space-y-2 w-full sm:w-auto">
              {['twitter', 'tiktok', 'instagram', 'facebook', 'youtube'].map(platform => {
                const platformData = user?.[platform]
                const platformName = platform.charAt(0).toUpperCase() + platform.slice(1) === 'Twitter' ? 'X (Twitter)' : platform.charAt(0).toUpperCase() + platform.slice(1)
                return (
                  <div key={platform} className="text-xs sm:text-sm flex items-center justify-between gap-2">
                    <span className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{platformName}:</span>
                    {platformData?.username ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">@{platformData.username}</span>
                        <button onClick={() => handleUnlinkSocial(platform)} disabled={loading} className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">Unlink</button>
                      </div>
                    ) : (
                      <button onClick={() => handleConnectSocial(platform)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Connect</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`${isDark ? 'bg-gradient-to-br from-slate-700 to-slate-600' : 'bg-gradient-to-br from-white to-slate-50'} p-4 rounded-lg shadow-sm transition-colors`}>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tasks Completed</div>
            <div className={`text-xl font-bold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{user?.tasksCompleted || 0}</div>
          </div>
          <div className={`${isDark ? 'bg-gradient-to-br from-slate-700 to-slate-600' : 'bg-gradient-to-br from-white to-slate-50'} p-4 rounded-lg shadow-sm transition-colors`}>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Referrals</div>
            <div className={`text-xl font-bold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{user?.referrals || 0}</div>
          </div>
          <div className={`${isDark ? 'bg-gradient-to-br from-slate-700 to-slate-600' : 'bg-gradient-to-br from-white to-slate-50'} p-4 rounded-lg shadow-sm transition-colors`}>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Account Status</div>
            <div className={`text-xl font-bold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{user?.accountStatus || 'Active'}</div>
          </div>
        </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full sm:justify-end">
          <button onClick={() => window.location.href = '/tasks'} className="px-4 py-2 w-full sm:w-auto bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200">View Tasks</button>
          <button onClick={handleLogout} disabled={loading} className="px-4 py-2 w-full sm:w-auto bg-red-600 text-white rounded-full hover:bg-red-700">{loading? 'Working...' : 'Logout'}</button>
        </div>
        </motion.div>
      </Container>
    </div>
  )
}

