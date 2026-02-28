import { useSelector, useDispatch } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from '../utils/axios'
import { loginSuccess } from '../features/auth/authSlice'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useSelector(state => state.auth)
  const dispatch = useDispatch()
  const location = useLocation()
  const [checking, setChecking] = useState(false)

  // on first mount, if not authenticated try to fetch profile
  useEffect(() => {
    if (!isAuthenticated) {
      setChecking(true)
      axios.get('/auth/profile').then(res => {
        if (res.data?.success) {
          dispatch(loginSuccess({ user: res.data.user, token: null, balance: res.data.balance }))
        }
      }).catch(err => {
        // ignore - will redirect below
      }).finally(() => setChecking(false))
    }
  }, [isAuthenticated, dispatch])

  if (checking) return <div className="p-4 text-center">Checking authentication…</div>

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} />

  // If user is authenticated but hasn't verified email, force them to verify first
  if (isAuthenticated && user && !user.isAccountVerify) {
    return <Navigate to="/verify-email" state={{ from: location }} />
  }

  return children
}