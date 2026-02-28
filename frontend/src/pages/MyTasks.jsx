import { useEffect, useState } from 'react'
import axios from '../utils/axios'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'

export default function MyTasks(){
  const { isDark } = useTheme()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('NGN')
  const [exchangeRate, setExchangeRate] = useState(null)
  const [convertedTasks, setConvertedTasks] = useState([])

  // Fetch exchange rate when component mounts
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const res = await axios.get('/campaigns/exchange-rate/current')
        if (res.data.success && res.data.rate) {
          setExchangeRate(res.data.rate)
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate:', err)
      }
    }
    fetchExchangeRate()
  }, [])

  // Convert task amounts when currency or exchange rate changes
  useEffect(() => {
    if (!tasks.length) return
    
    const converted = tasks.map(t => {
      let amount = t.amount
      
      // If user selects USD and task is in NGN, convert NGN to USD
      if (currency === 'USD' && t.currency === 'NGN' && exchangeRate) {
        amount = Number((t.amount / exchangeRate).toFixed(2))
      }
      // If user selects NGN and task is in USD, convert USD to NGN
      else if (currency === 'NGN' && t.currency === 'USD' && exchangeRate) {
        amount = Math.round(t.amount * exchangeRate)
      }
      
      return {
        ...t,
        displayAmount: amount,
        displayCurrency: currency
      }
    })
    
    setConvertedTasks(converted)
  }, [tasks, currency, exchangeRate])

  const payFor = async (task) => {
    try {
      if (!task.approval) return alert('This task is not payable here')
      const res = await axios.post(`/campaigns/pay-approval/${task._id}`, { currency })
      if (res.data && res.data.success && res.data.data) {
        const data = res.data.data
        // Prefer inline popup when Paystack inline JS is available
        const authUrl = data.authorization_url || data.authorizationUrl || null
        const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || data.publicKey || (data.paymentData && data.paymentData.publicKey)

        const ensurePaystack = () => new Promise((resolve, reject) => {
          if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') return resolve(window.PaystackPop)
          const src = 'https://js.paystack.co/v1/inline.js'
          const existing = document.querySelector(`script[src="${src}"]`)
          if (existing) {
            existing.addEventListener('load', () => resolve(window.PaystackPop))
            existing.addEventListener('error', reject)
            return
          }
          const s = document.createElement('script')
          s.src = src
          s.async = true
          s.onload = () => resolve(window.PaystackPop)
          s.onerror = (err) => reject(err)
          document.head.appendChild(s)
        })

        if (publicKey) {
          try {
            await ensurePaystack()
            const handler = window.PaystackPop.setup({
              key: publicKey,
              email: data.customer?.email || '',
              amount: data.amount || data.display_amount || (data.paymentData && data.paymentData.amount) || 0,
              ref: data.reference || data.tx_ref || `PAY_${Date.now()}`,
              onClose: function(){ toast('Payment closed') },
              callback: function(response){
                // Payment completed in popup. Poll backend to confirm and refresh UI.
                toast.success('Payment completed. Verifying...')
                ;(async function pollVerification(ref){
                  const maxAttempts = 8
                  const delay = ms => new Promise(r => setTimeout(r, ms))
                  for (let i=0;i<maxAttempts;i++){
                    try{
                      const check = await axios.get(`/campaigns/check-payment/${encodeURIComponent(ref)}`)
                      if (check.data && check.data.success && check.data.status === 'successful'){
                        toast.success('Payment verified — task will be activated shortly')
                        // Refresh page to show new state
                        window.location.reload()
                        return
                      }
                    }catch(e){ console.warn('poll verify error', e) }
                    await delay(1500)
                  }
                  toast('Payment verification is pending. We will update you once confirmed.')
                })(response.reference || response.ref || response.transaction)
              }
            })
            try { handler.openIframe() } catch (e) {
              console.warn('paystack open failed', e)
              toast.error('Inline payment popup blocked. Opening payment in a new tab.')
              toast.info('If the popup is blocked, allow popups for this site to use the inline checkout.')
              if (authUrl) window.open(authUrl, '_blank', 'noopener')
              else toast.error('Payment initialization failed')
            }
          } catch (e) {
            console.warn('Paystack inline load failed', e)
            if (authUrl) {
              toast.info('Opening payment page in a new tab. Complete payment there and return to this tab.')
              window.open(authUrl, '_blank', 'noopener')
            } else {
              alert('Payment cannot be started. Missing Paystack public key or payment URL.')
            }
          }
        } else if (authUrl) {
          // Fallback to hosted checkout in new tab
          toast.info('Opening payment page in a new tab. Complete payment there and return to this tab.')
          window.open(authUrl, '_blank', 'noopener')
        } else {
          alert('Payment cannot be started. Missing Paystack public key or payment URL.')
        }
      } else {
        alert(res.data?.message || 'Could not initialize payment')
      }
    } catch (err) {
      console.error(err)
      alert('Payment init failed')
    }
  }

  useEffect(()=>{
    let mounted = true
    const load = async ()=>{
      try{
        const res = await axios.get('/campaigns/mine')
        if (mounted) setTasks(res.data.tasks || [])
      }catch(err){
        console.error(err)
      }finally{ if(mounted) setLoading(false) }
    }
    load()
    return ()=> mounted = false
  },[])

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-b from-white via-sky-50 to-indigo-50'} transition-colors`}>
      <Container>
        <div className="max-w-4xl mx-auto w-full sm:mx-0 px-2 sm:px-0">
          <h2 className={`text-xl font-bold mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>My Tasks</h2>
          {loading ? <div className={isDark ? 'text-slate-400' : 'text-gray-600'}>Loading...</div> : (
            <div className="space-y-4">
              {tasks.length===0 ? <div className={isDark ? 'text-slate-400' : 'text-gray-600'}>No tasks created yet.</div> : (
                <>
                  <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <label className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>Currency</label>
                      <select value={currency} onChange={e=>setCurrency(e.target.value)} className={`p-2 border rounded transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`}>
                        <option value="NGN">NGN</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    {exchangeRate && (
                      <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                        Exchange Rate: 1 USD = ₦{exchangeRate.toFixed(2)}
                      </div>
                    )}
                  </div>
                  {convertedTasks.map(t=> (
                    <div key={t._id} className={`p-4 rounded-xl shadow-sm w-full transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex-1">
                          <div className={`font-semibold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>{t.action.toUpperCase()} — {t.link}</div>
                          <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                            Amount: {t.displayCurrency === 'NGN' ? '₦' : '$'}{t.displayAmount.toLocaleString()} • Slots: {t.slots}
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                          <div className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>{t.status}</div>
                          {t.approval && <button onClick={()=>payFor(t)} className="px-3 py-1 bg-blue-600 text-white rounded whitespace-nowrap hover:bg-blue-700 transition-colors">Pay</button>}
                        </div>
                      </div>
                      {t.completedBy && t.completedBy.length > 0 && (
                        <div className={`mt-3 text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-700'}`}>
                          <div className={`font-medium mb-1 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>Completed By:</div>
                          <ul className="list-disc pl-5">
                            {t.completedBy.map(u => (
                              <li key={u.id}>{u.name || u.email} {u.email ? `(${u.email})` : ''}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
