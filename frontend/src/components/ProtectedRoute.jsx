import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useSelector(state => state.auth)
  const location = useLocation()

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} />

  // If user is authenticated but hasn't verified email, force them to verify first
  if (isAuthenticated && user && !user.isAccountVerify) {
    return <Navigate to="/verify-email" state={{ from: location }} />
  }

  return children
}