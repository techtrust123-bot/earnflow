// payment/callback.jsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import axios from '../utils/axios'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

export default function PaymentCallback() {
  const { isDark } = useTheme()
  const location = useLocation()

  useEffect(() => {
    const checkPayment = async () => {
      try {
        const res = await axios.get(`/user-tasks/check${location.search}`)
        if (res.data.success) {
          toast.success('Payment successful! Task activated.')
        } else {
          toast.error('Payment failed. Try again.')
        }
      } catch (err) {
        toast.error('Error checking payment')
      }
    }

    checkPayment()
  }, [location])

  return (
    <div className={`text-center py-20 min-h-screen flex flex-col items-center justify-center transition-colors ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gray-50'}`}>
      <h1 className={`text-3xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Processing Payment...</h1>
      <p className={`mt-4 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>We'll notify you once complete.</p>
    </div>
  )
}