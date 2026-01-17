import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import axios from '../utils/axios'
import Container from '../components/Container'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

export default function CampaignPayment(){
  const { isDark } = useTheme()
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initiating, setInitiating] = useState(false)
  const [method, setMethod] = useState('CARD')
  const [polling, setPolling] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const MAX_ATTEMPTS = 60 // ~5 minutes at 5s interval

  useEffect(()=>{
    let mounted = true
    const load = async ()=>{
      try{
        const res = await axios.get(`/campaigns/${id}`)
        if (mounted) setTask(res.data.task)
      }catch(err){
        toast.error(err.response?.data?.message || 'Could not load task')
        navigate('/my-tasks')
      }finally{ if(mounted) setLoading(false) }
    }
    load()
    return ()=> mounted = false
  },[id])

  const startPayment = async () => {
    setInitiating(true)
    try {
      const returnUrl = `${window.location.origin}/campaigns/pay/${id}`
      // Request payment session for the selected method
      const methods = method === 'ALL' ? ['CARD', 'ACCOUNT_TRANSFER', 'USSD'] : [method]
      const res = await axios.post('/campaigns/pay', { taskId: id, returnUrl, paymentMethods: methods })
      const url = res.data.paymentUrl
      const reserved = res.data.reservedAccount || res.data.reservation
      const provRef = res.data.providerReference
      // If provider returned a virtual account/reservation, show it to the user
      if (reserved && (reserved.accountNumber || reserved.virtualAccount || (reserved.data && reserved.data.accountNumber))) {
        setTask(prev => Object.assign({}, prev, { reservedAccount: reserved, providerReference: provRef }))
        setInitiating(false)
        return
      }
      if (url) {
        // Redirect to provider in same tab
        window.location.href = url
      } else {
        toast.error('Payment could not be started')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment init failed')
    } finally { setInitiating(false) }
  }

  // If redirected back from provider, try verify once
  useEffect(()=>{
    const q = new URLSearchParams(location.search)
    const paymentReference = q.get('paymentReference') || q.get('reference') || q.get('transactionReference') || q.get('transaction_reference') || q.get('txRef') || q.get('trxref') || q.get('trxRef') || q.get('txnRef')
    if (paymentReference) {
      (async ()=>{
        try{
          const res = await axios.post('/campaigns/verify', { taskId: id, paymentReference })
          toast.success('Payment confirmed; task activated')
          navigate('/my-tasks')
        }catch(err){
          toast.error('Payment not confirmed yet')
        }
      })()
    }
  }, [location.search, id, navigate])

  // Auto-poll for payment status when task is loaded and unpaid
  useEffect(() => {
    let mounted = true
    let timer
    const verifyOnce = async () => {
      try {
        const res = await axios.post('/campaigns/verify', { taskId: id })
        if (res.data?.success) {
          toast.success('Payment confirmed; task activated')
          navigate('/my-tasks')
          return true
        }
        // Non-success responses (e.g., 400) will be handled below
      } catch (err) {
        const status = err?.response?.status
        // Stop polling on client (4xx) or server (5xx) errors to avoid spamming
        if (status && (status >= 400)) {
          setPolling(false)
          toast.error(err.response?.data?.message || 'Verification error; stopped polling')
          return false
        }
      }
      return false
    }

    const startPolling = async () => {
      if (!mounted) return
      setPolling(true)
      setAttempts(0)
      const tick = async () => {
        if (!mounted) return
        setAttempts(a => a + 1)
        const ok = await verifyOnce()
        if (ok) {
          setPolling(false)
          return
        }
        if (attempts + 1 >= MAX_ATTEMPTS) {
          setPolling(false)
          toast.error('Payment not confirmed yet — please try again later')
          return
        }
        timer = setTimeout(tick, 5000)
      }
      timer = setTimeout(tick, 5000)
    }

    if (task && !task.paid && !polling) {
      startPolling()
    }

    return () => { mounted = false; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task])

  if (loading) return <div className={`py-20 text-center transition-colors ${isDark ? 'bg-slate-900 text-slate-50' : 'bg-white text-gray-900'}`}>Loading...</div>

  return (
    <div className={`min-h-screen p-6 transition-colors ${isDark ? 'bg-slate-900' : 'bg-gradient-to-b from-white via-sky-50 to-indigo-50'}`}>
      <Container>
        <div className={`max-w-md mx-auto p-6 rounded-xl shadow-md transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
          <h2 className={`text-xl font-bold mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Pay for Campaign</h2>
          <div className={`text-sm mb-3 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Action: <strong>{task?.action}</strong></div>
          <div className={`text-sm mb-3 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Link: <a href={task?.link} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700">Open</a></div>
          <div className={`space-y-2 mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
            <div>Cost: {task?.currency === 'NGN' ? '₦' : '$'}{task?.cost}</div>
            <div>Commission (10%): {task?.currency === 'NGN' ? '₦' : '$'}{task?.commission}</div>
            <div className="font-semibold">Total: {task?.currency === 'NGN' ? '₦' : '$'}{task?.totalCost}</div>
          </div>
          <div className="mb-4">
            <div className={`text-sm mb-2 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Choose payment method</div>
            <div className="flex gap-2 flex-wrap">
              <label className={`px-3 py-2 rounded-lg border transition-colors ${method==='CARD' ? (isDark ? 'bg-indigo-900/50 border-indigo-500' : 'bg-blue-50 border-blue-400') : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white')}`}>
                <input type="radio" name="method" value="CARD" checked={method==='CARD'} onChange={() => setMethod('CARD')} className="mr-2" /> Card
              </label>
              <label className={`px-3 py-2 rounded-lg border transition-colors ${method==='ACCOUNT_TRANSFER' ? (isDark ? 'bg-indigo-900/50 border-indigo-500' : 'bg-blue-50 border-blue-400') : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white')}`}>
                <input type="radio" name="method" value="ACCOUNT_TRANSFER" checked={method==='ACCOUNT_TRANSFER'} onChange={() => setMethod('ACCOUNT_TRANSFER')} className="mr-2" /> Bank Transfer
              </label>
              <label className={`px-3 py-2 rounded-lg border transition-colors ${method==='USSD' ? (isDark ? 'bg-indigo-900/50 border-indigo-500' : 'bg-blue-50 border-blue-400') : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white')}`}>
                <input type="radio" name="method" value="USSD" checked={method==='USSD'} onChange={() => setMethod('USSD')} className="mr-2" /> USSD
              </label>
              <label className={`px-3 py-2 rounded-lg border transition-colors ${method==='ALL' ? (isDark ? 'bg-indigo-900/50 border-indigo-500' : 'bg-blue-50 border-blue-400') : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white')}`}>
                <input type="radio" name="method" value="ALL" checked={method==='ALL'} onChange={() => setMethod('ALL')} className="mr-2" /> All Options
              </label>
            </div>
          </div>

          {task?.reservedAccount ? (
            <div className={`mb-4 p-4 rounded-lg transition-colors ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Payment Details (Bank transfer / USSD)</h4>
              <div className={`text-sm transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Account number: <strong>{task.reservedAccount.accountNumber || task.reservedAccount.account_number || (task.reservedAccount.data && task.reservedAccount.data.accountNumber) || '—'}</strong></div>
              <div className={`text-sm transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Bank: <strong>{task.reservedAccount.bankName || task.reservedAccount.bank || task.reservedAccount.data?.bankName || '—'}</strong></div>
              <div className={`text-sm transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Reference: <strong>{task.providerReference || task.reservedAccount.reference || task.reservedAccount.accountReference || '—'}</strong></div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(task.reservedAccount.accountNumber || '') ; toast.success('Copied') }} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors">Copy Account</button>
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Please pay to ${task.reservedAccount.accountNumber} (${task.reservedAccount.bankName || ''}) Ref: ${task.providerReference}`)}`)} className={`px-3 py-2 rounded border transition-colors ${isDark ? 'border-slate-600 text-slate-50 hover:bg-slate-700' : 'border-gray-300 text-gray-900 hover:bg-gray-100'}`}>Share</button>
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button onClick={startPayment} disabled={initiating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors disabled:opacity-50">{initiating ? 'Starting...' : 'Proceed to Payment'}</button>
            <button onClick={() => navigate('/my-tasks')} className={`px-4 py-3 rounded-lg border transition-colors ${isDark ? 'border-slate-600 text-slate-50 hover:bg-slate-700' : 'border-gray-300 text-gray-900 hover:bg-gray-100'}`}>Cancel</button>
          </div>
        </div>
      </Container>
    </div>
  )
}
