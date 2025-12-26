import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import axios from '../utils/axios'
import Container from '../components/Container'
import toast from 'react-hot-toast'

export default function CampaignPayment(){
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

  if (loading) return <div className="py-20 text-center">Loading...</div>

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-white via-sky-50 to-indigo-50">
      <Container>
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold mb-4">Pay for Campaign</h2>
          <div className="text-sm text-gray-600 mb-3">Action: <strong>{task?.action}</strong></div>
          <div className="text-sm text-gray-600 mb-3">Link: <a href={task?.link} target="_blank" rel="noreferrer" className="text-indigo-600">Open</a></div>
          <div className="space-y-2 mb-4">
            <div>Cost: {task?.currency === 'NGN' ? '₦' : '$'}{task?.cost}</div>
            <div>Commission (10%): {task?.currency === 'NGN' ? '₦' : '$'}{task?.commission}</div>
            <div className="font-semibold">Total: {task?.currency === 'NGN' ? '₦' : '$'}{task?.totalCost}</div>
          </div>
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Choose payment method</div>
            <div className="flex gap-2">
              <label className={`px-3 py-2 rounded-lg border ${method==='CARD' ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}>
                <input type="radio" name="method" value="CARD" checked={method==='CARD'} onChange={() => setMethod('CARD')} className="mr-2" /> Card
              </label>
              <label className={`px-3 py-2 rounded-lg border ${method==='ACCOUNT_TRANSFER' ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}>
                <input type="radio" name="method" value="ACCOUNT_TRANSFER" checked={method==='ACCOUNT_TRANSFER'} onChange={() => setMethod('ACCOUNT_TRANSFER')} className="mr-2" /> Bank Transfer
              </label>
              <label className={`px-3 py-2 rounded-lg border ${method==='USSD' ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}>
                <input type="radio" name="method" value="USSD" checked={method==='USSD'} onChange={() => setMethod('USSD')} className="mr-2" /> USSD
              </label>
              <label className={`px-3 py-2 rounded-lg border ${method==='ALL' ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}>
                <input type="radio" name="method" value="ALL" checked={method==='ALL'} onChange={() => setMethod('ALL')} className="mr-2" /> All Options
              </label>
            </div>
          </div>

          {task?.reservedAccount ? (
            <div className="mb-4 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Payment Details (Bank transfer / USSD)</h4>
              <div className="text-sm">Account number: <strong>{task.reservedAccount.accountNumber || task.reservedAccount.account_number || (task.reservedAccount.data && task.reservedAccount.data.accountNumber) || '—'}</strong></div>
              <div className="text-sm">Bank: <strong>{task.reservedAccount.bankName || task.reservedAccount.bank || task.reservedAccount.data?.bankName || '—'}</strong></div>
              <div className="text-sm">Reference: <strong>{task.providerReference || task.reservedAccount.reference || task.reservedAccount.accountReference || '—'}</strong></div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(task.reservedAccount.accountNumber || '') ; toast.success('Copied') }} className="px-3 py-2 rounded bg-blue-600 text-white">Copy Account</button>
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Please pay to ${task.reservedAccount.accountNumber} (${task.reservedAccount.bankName || ''}) Ref: ${task.providerReference}`)}`)} className="px-3 py-2 rounded border">Share</button>
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button onClick={startPayment} disabled={initiating} className="flex-1 bg-blue-600 text-white py-3 rounded-lg">{initiating ? 'Starting...' : 'Proceed to Payment'}</button>
            <button onClick={() => navigate('/my-tasks')} className="px-4 py-3 rounded-lg border">Cancel</button>
          </div>
        </div>
      </Container>
    </div>
  )
}
