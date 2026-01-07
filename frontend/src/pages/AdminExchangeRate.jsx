import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from '../utils/axios'
import toast from 'react-hot-toast'
import Container from '../components/Container'

export default function AdminExchangeRate(){
  const [rate, setRate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [source, setSource] = useState(null)
  const [lastModifiedBy, setLastModifiedBy] = useState(null)
  const [lastModifiedAt, setLastModifiedAt] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [externalRate, setExternalRate] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const load = async ()=>{
    try{
      const res = await axios.get('/admin/settings/exchange-rate')
      if (res.data && res.data.success) {
        setRate(res.data.rate || '')
        setSource(res.data.source || null)
        setLastModifiedBy(res.data.lastModifiedBy || null)
        setLastModifiedAt(res.data.lastModifiedAt || null)
      }
    }catch(err){
      console.error(err)
    }finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  // load external API preview
  const loadPreview = async () => {
    setLoadingPreview(true)
    try{
      const res = await axios.get('/admin/settings/exchange-rate/preview')
      if (res.data && res.data.success) setExternalRate(res.data.rate)
    }catch(err){ console.error('preview load failed', err) }
    finally{ setLoadingPreview(false) }
  }

  useEffect(()=>{ loadPreview() }, [])

  useEffect(() => {
    if (!autoRefresh) return
    // perform immediate refresh then set interval
    load()
    const id = setInterval(() => load(), 60000)
    return () => clearInterval(id)
  }, [autoRefresh])

  useEffect(() => {
    if (!autoRefresh) return
    loadPreview()
    const id = setInterval(() => loadPreview(), 60000)
    return () => clearInterval(id)
  }, [autoRefresh])

  const save = async ()=>{
    setSaving(true); setMessage(null)
    try{
      const num = parseFloat(String(rate).trim())
      if (isNaN(num) || num <= 0) return setMessage('Enter a valid numeric rate')
      const res = await axios.put('/admin/settings/exchange-rate', { rate: num })
      if (res.data && res.data.success) {
        toast.success('Saved')
        setMessage('Saved')
        setSource('db')
        // reload to pick up metadata
        load()
      } else {
        toast.error(res.data?.message || 'Save failed')
        setMessage(res.data?.message || 'Save failed')
      }
    }catch(err){
      console.error(err)
      toast.error(err.response?.data?.message || 'Save failed')
      setMessage(err.response?.data?.message || 'Save failed')
    }finally{ setSaving(false) }
  }

  const clearOverride = async (confirmed = false)=>{
    if (!confirmed) return setShowConfirmClear(true)
    setShowConfirmClear(false)
    setSaving(true); setMessage(null)
    try{
      const res = await axios.delete('/admin/settings/exchange-rate')
      if (res.data && res.data.success) { setRate(''); setMessage('Override cleared'); load(); loadPreview() }
      else setMessage('Clear failed')
    }catch(err){ setMessage('Clear failed') }
    finally{ setSaving(false) }
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <Container>
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">Admin • Exchange Rate</h2>
              <p className="text-sm text-gray-600 mb-2">Set the USD → NGN admin override rate. This takes precedence over API rates.</p>
              <div className="text-sm">
                Source: {source === 'db' ? <span className="font-medium">Admin override</span> : source === 'env' ? <span className="font-medium">Environment</span> : <span className="font-medium">API / None</span>}
                {lastModifiedBy && <span className="ml-3 text-gray-500">By: {lastModifiedBy.name || lastModifiedBy.email || lastModifiedBy}</span>}
                {lastModifiedAt && <span className="ml-3 text-gray-500">At: {new Date(lastModifiedAt).toLocaleString()}</span>}
              </div>
            </div>
            <div className="text-right">
              <Link to="/admin/exchange-rate/audit" className="text-sm text-indigo-600 underline">View Audit</Link>
              <div className="mt-2 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} /> Auto-refresh</label>
              </div>
            </div>
          </div>
          {loading ? <div>Loading...</div> : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">USD → NGN Rate</label>
                <input inputMode="decimal" type="text" value={rate} onChange={e=>setRate(e.target.value)} className="mt-1 p-2 border rounded w-full" placeholder="e.g. 1550" />
              </div>
              <div className="text-sm text-gray-600">
                API rate preview: {loadingPreview ? 'loading...' : (externalRate ? <span className="font-medium">{externalRate}</span> : 'unavailable')}
                {externalRate && rate && Number(rate) > 0 && (
                  <span className="ml-3 text-xs text-gray-500">diff: {Math.round(((Number(rate) - externalRate)/externalRate)*100)}%</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={()=>clearOverride(false)} disabled={saving} className="px-4 py-2 border rounded">Clear Override</button>
                {message && <div className="text-sm text-gray-700">{message}</div>}
              </div>
            </div>
          )}
        </div>
      </Container>
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setShowConfirmClear(false)} />
          <div className="relative bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Confirm Clear Override</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to clear the admin exchange-rate override? This will cause the service to use the external API or environment value.</p>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setShowConfirmClear(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={()=>clearOverride(true)} className="px-4 py-2 bg-red-600 text-white rounded">Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
