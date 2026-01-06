import { useEffect, useState } from 'react'
import axios from '../utils/axios'
import Container from '../components/Container'

export default function MyTasks(){
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('NGN')

  const payFor = async (task) => {
    try {
      if (!task.approval) return alert('This task is not payable here')
      const res = await axios.post(`/campaigns/pay-approval/${task._id}`, { currency })
      if (res.data && res.data.success && res.data.data) {
        const data = res.data.data
        // open paystack
        if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
          const handler = window.PaystackPop.setup({
            key: data.authorization_url ? (process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || data.publicKey) : (process.env.REACT_APP_PAYSTACK_PUBLIC_KEY),
            email: data.customer?.email || '',
            amount: data.amount || data.display_amount || 0,
            ref: data.reference || data.tx_ref || `PAY_${Date.now()}`,
            onClose: function(){ alert('Payment closed') },
            callback: function(response){ alert('Payment complete; verify via webhook') }
          })
          try{ handler.openIframe() }catch(e){ console.warn(e) }
        } else if (data.authorization_url) {
          // fallback redirect
          window.location.href = data.authorization_url
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
    <div className="min-h-screen p-6 bg-gradient-to-b from-white via-sky-50 to-indigo-50">
      <Container>
        <div className="max-w-4xl mx-auto w-full sm:mx-0 px-2 sm:px-0">
          <h2 className="text-xl font-bold mb-4">My Tasks</h2>
          {loading ? <div>Loading...</div> : (
            <div className="space-y-4">
              {tasks.length===0 ? <div className="text-gray-600">No tasks created yet.</div> : (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <label className="text-sm font-medium">Currency</label>
                    <select value={currency} onChange={e=>setCurrency(e.target.value)} className="p-2 border rounded">
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  {tasks.map(t=> (
                    <div key={t._id} className="bg-white p-4 rounded-xl shadow-sm w-full">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{t.action.toUpperCase()} — {t.link}</div>
                          <div className="text-sm text-gray-600">Amount: {t.currency==='NGN' ? '₦' : '$'}{t.amount} • Slots: {t.slots}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm font-medium">{t.status}</div>
                          {t.approval && <button onClick={()=>payFor(t)} className="px-3 py-1 bg-blue-600 text-white rounded">Pay</button>}
                        </div>
                      </div>
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
