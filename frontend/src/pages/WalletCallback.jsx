import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from '../utils/axios'
import toast from 'react-hot-toast'

const WalletCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('Verifying your payment...')

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference')
      const trxref = searchParams.get('trxref')

      if (!reference) {
        setStatus('error')
        setMessage('Payment reference not found')
        return
      }

      try {
        // Verify the payment with our backend
        const response = await axios.get(`/wallet/verify/${reference}`)

        if (response.data.success) {
          setStatus('success')
          setMessage('Payment verified successfully! Your wallet has been credited.')
          toast.success('Wallet funded successfully!')

          // Redirect to wallet page after 3 seconds
          setTimeout(() => {
            navigate('/wallet')
          }, 3000)
        } else {
          setStatus('error')
          setMessage(response.data.message || 'Payment verification failed')
          toast.error(response.data.message || 'Payment verification failed')
        }
      } catch (error) {
        console.error('Payment verification error:', error)
        setStatus('error')
        setMessage('Failed to verify payment. Please contact support if amount was debited.')
        toast.error('Payment verification failed')
      }
    }

    verifyPayment()
  }, [searchParams, navigate])

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        )
      case 'success':
        return (
          <div className="text-green-500 text-6xl">✓</div>
        )
      case 'error':
        return (
          <div className="text-red-500 text-6xl">✕</div>
        )
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            {getStatusIcon()}

            <h2 className={`mt-6 text-2xl font-bold ${getStatusColor()}`}>
              {status === 'verifying' && 'Verifying Payment'}
              {status === 'success' && 'Payment Successful!'}
              {status === 'error' && 'Payment Failed'}
            </h2>

            <p className="mt-4 text-gray-600">
              {message}
            </p>

            {status === 'success' && (
              <p className="mt-4 text-sm text-gray-500">
                Redirecting to your wallet in a few seconds...
              </p>
            )}

            <div className="mt-8 space-y-4">
              <button
                onClick={() => navigate('/wallet')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Go to Wallet
              </button>

              {status === 'error' && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Go to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WalletCallback