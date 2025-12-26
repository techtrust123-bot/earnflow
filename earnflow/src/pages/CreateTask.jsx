import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import axios from '../utils/axios'
import toast from 'react-hot-toast'

export default function CreateTask() {
  const { balance = 0 } = useSelector(s => s.auth.balance || s.auth)

  const [form, setForm] = useState({
    title: '',
    platform: 'twitter',
    action: 'follow',
    socialHandle: '',
    numUsers: 100,
    taskAmount: 50,
    paymentMethods: ['CARD'],
    taskDetails: ''
  })

  const [loading, setLoading] = useState(false)
  const [payWithBalance, setPayWithBalance] = useState(false)
  const [paymentData, setPaymentData] = useState(null) // From backend

  const breakdown = useMemo(() => {
    const base = Number(form.taskAmount || 0) * Number(form.numUsers || 0)
    const commission = Math.round(base * 0.1)
    return { base, commission, total: base + commission }
  }, [form.taskAmount, form.numUsers])

  const insufficientBalance = payWithBalance && balance < breakdown.total

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.socialHandle.trim() || !form.taskDetails.trim()) {
      toast.error('Social handle and task details are required')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: form.title.trim() || undefined,
        platform: form.platform,
        action: form.action,
        socialHandle: form.socialHandle.trim(),
        numUsers: Number(form.numUsers),
        taskAmount: Number(form.taskAmount),
        taskDetails: form.taskDetails.trim(),
        paymentMethods: Array.isArray(form.paymentMethods) ? form.paymentMethods : (String(form.paymentMethods || '').split(',').map(m=>m.trim()).filter(Boolean)),
        payWithBalance
      }

      const res = await axios.post('/user-tasks/create', payload)

      if (res.data.success) {
        if (payWithBalance) {
          toast.success('Task created and activated with wallet balance!')
          // Refresh tasks or redirect
        } else if (res.data.paymentData) {
          toast.success('Opening payment...')
          setPaymentData(res.data.paymentData)
          // Trigger Monnify SDK
          openMonnifyCheckout(res.data.paymentData)
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  const openMonnifyCheckout = (data) => {
    const loadScript = (src) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve()
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Failed to load script: ' + src))
      document.head.appendChild(s)
    })

    const init = async () => {
      try {
        await loadScript('https://checkout.monnify.com/monnify.js')
      } catch (e) {
        console.error('Monnify script load failed', e)
        toast.error('Payment gateway unavailable')
        return
      }

      const sdk = window.MonnifySDK
      if (!sdk || typeof sdk.initialize !== 'function') {
        toast.error('Payment SDK not available')
        return
      }

      const params = {
        amount: data.amount,
        currency: data.currency || 'NGN',
        reference: data.reference || data.paymentReference,
        contractCode: data.contractCode || process.env.REACT_APP_MONNIFY_CONTRACT_CODE,
        customerFullName: data.customerName || data.customerFullName || '',
        customerEmail: data.customerEmail || data.customerEmail || '',
        apiKey: data.apiKey || data.apiKey,
        paymentDescription: data.paymentDescription || 'Sponsored Task Payment',
        paymentMethods: data.paymentMethods || data.paymentMethods || []
      }

      try {
        const initResult = await sdk.initialize(params)
        // Some SDK versions return an object; some auto-open. Try `open()` if available.
        if (sdk.open && typeof sdk.open === 'function') {
          try { sdk.open() } catch (e) { /* ignore */ }
        } else if (initResult && typeof initResult.open === 'function') {
          try { initResult.open() } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.error('Monnify init error', err)
        toast.error('Could not initialize payment')
      }
    }

    init()
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Create Sponsored Task</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title (optional)" className="p-2 border rounded w-full" />

          <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="p-2 border rounded w-full">
            <option value="twitter">Twitter</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </select>

          <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} className="p-2 border rounded w-full">
            <option value="follow">Follow</option>
            <option value="like">Like</option>
            <option value="repost">Repost/Retweet</option>
            <option value="comment">Comment/Reply</option>
          </select>

          <input value={form.socialHandle} onChange={e => setForm(f => ({ ...f, socialHandle: e.target.value }))} placeholder="Social Handle or URL" className="p-2 border rounded w-full" required />

          <input type="number" min="100" value={form.numUsers} onChange={e => setForm(f => ({ ...f, numUsers: Number(e.target.value) }))} className="p-2 border rounded w-full" />
          <input type="number" min="50" value={form.taskAmount} onChange={e => setForm(f => ({ ...f, taskAmount: Number(e.target.value) }))} className="p-2 border rounded w-full" />
        </div>

        <textarea value={form.taskDetails} onChange={e => setForm(f => ({ ...f, taskDetails: e.target.value }))} placeholder="Task details / instructions" className="w-full mt-3 p-2 border rounded" rows={4} required />

        {/* Payment Methods selection (single choice) */}
        <div className="mt-4 mb-6">
          <p className="font-semibold mb-2">Payment method</p>
          <div className="flex flex-wrap gap-2">
            {['CARD','ACCOUNT_TRANSFER','BANK_TRANSFER','USSD','BALANCE'].map(method => {
              const selected = Array.isArray(form.paymentMethods) && form.paymentMethods[0] === method
              return (
                <label key={method} className={`px-3 py-2 border rounded cursor-pointer ${selected ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selected}
                    onChange={() => {
                      setForm(f => ({ ...f, paymentMethods: [method] }))
                      if (method === 'BALANCE') setPayWithBalance(true)
                      else setPayWithBalance(false)
                    }}
                    className="mr-2"
                  />
                  {method}
                </label>
              )
            })}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl mb-6">
          <h3 className="font-bold text-lg mb-4">Payment Breakdown</h3>
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-gray-600">Base Amount</p>
              <p className="text-2xl font-bold">₦{breakdown.base.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Commission (10%)</p>
              <p className="text-2xl font-bold text-orange-600">₦{breakdown.commission.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Total</p>
              <p className="text-3xl font-bold text-blue-600">₦{breakdown.total.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Pay with Balance Toggle */}
        <div className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={payWithBalance}
              onChange={e => {
                const checked = e.target.checked
                setPayWithBalance(checked)
                setForm(f => ({ ...f, paymentMethods: checked ? ['BALANCE'] : (Array.isArray(f.paymentMethods) && f.paymentMethods.length ? f.paymentMethods : ['CARD']) }))
              }}
              className="w-5 h-5"
            />
            <div>
              <p className="font-medium">Pay with Wallet Balance</p>
              <p className="text-sm text-gray-600">Available: ₦{balance.toLocaleString()}</p>
            </div>
          </label>
          {insufficientBalance && (
            <p className="text-red-600 font-medium">Insufficient balance</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || insufficientBalance}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-xl font-bold text-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Processing...' : payWithBalance ? 'Pay with Balance' : 'Proceed to Payment'}
        </button>
      </form>
    </div>
  )
}