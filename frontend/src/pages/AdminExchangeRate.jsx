import { useEffect, useState } from 'react'
import axios from '../utils/axios'
import Container from '../components/Container'

export default function AdminExchangeRate(){
  const [rate, setRate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const load = async ()=>{
    try{
      const res = await axios.get('/admin/settings/exchange-rate')
      if (res.data && res.data.success) {
        setRate(res.data.rate || '')
      }
    }catch(err){
      console.error(err)
    }finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const save = async ()=>{
    setSaving(true); setMessage(null)
    try{
      const num = Number(rate)
      if (isNaN(num) || num <= 0) return setMessage('Enter a valid numeric rate')
      const res = await axios.put('/admin/settings/exchange-rate', { rate: num })
      if (res.data && res.data.success) setMessage('Saved')
      else setMessage(res.data?.message || 'Save failed')
    }catch(err){
      console.error(err)
      setMessage(err.response?.data?.message || 'Save failed')
    }finally{ setSaving(false) }
  }

  const clearOverride = async ()=>{
    setSaving(true); setMessage(null)
    try{
      const res = await axios.delete('/admin/settings/exchange-rate')
      if (res.data && res.data.success) { setRate(''); setMessage('Override cleared') }
      else setMessage('Clear failed')
    }catch(err){ setMessage('Clear failed') }
    finally{ setSaving(false) }
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <Container>
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Admin • Exchange Rate</h2>
          <p className="text-sm text-gray-600 mb-4">Set the USD → NGN admin override rate. This takes precedence over API rates.</p>
          {loading ? <div>Loading...</div> : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">USD → NGN Rate</label>
                <input type="text" value={rate} onChange={e=>setRate(e.target.value)} className="mt-1 p-2 border rounded w-full" placeholder="e.g. 1550" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={clearOverride} disabled={saving} className="px-4 py-2 border rounded">Clear Override</button>
                {message && <div className="text-sm text-gray-700">{message}</div>}
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
