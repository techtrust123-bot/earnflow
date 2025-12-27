// payment/callback.jsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import axios from '../utils/axios'
import toast from 'react-hot-toast'

export default function PaymentCallback() {
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
    <div className="text-center py-20">
      <h1 className="text-3xl font-bold">Processing Payment...</h1>
      <p className="mt-4">We'll notify you once complete.</p>
    </div>
  )
}