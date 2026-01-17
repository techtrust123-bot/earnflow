import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from '../utils/axios'
import toast from 'react-hot-toast'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

export default function AdminExchangeRate(){
  const { isDark } = useTheme()
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
    <div className={`min-h-screen p-6 transition-colors ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <Container>
        <div className={`max-w-2xl mx-auto p-6 rounded-lg shadow transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className={`text-xl font-bold mb-1 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Admin • Exchange Rate</h2>
              <p className={`text-sm mb-2 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Set the USD → NGN admin override rate. This takes precedence over API rates.</p>
              <div className={`text-sm transition-colors ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                Source: {source === 'db' ? <span className="font-medium">Admin override</span> : source === 'env' ? <span className="font-medium">Environment</span> : <span className="font-medium">API / None</span>}
                {lastModifiedBy && <span className={`ml-3 transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>By: {lastModifiedBy.name || lastModifiedBy.email || lastModifiedBy}</span>}
                {lastModifiedAt && <span className={`ml-3 transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>At: {new Date(lastModifiedAt).toLocaleString()}</span>}
              </div>
            </div>
            <div className="text-right">
              <Link to="/admin/exchange-rate/audit" className="text-sm text-indigo-600 hover:text-indigo-700 underline transition-colors">View Audit</Link>
              <div className="mt-2 text-sm">
                <label className={`inline-flex items-center gap-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} /> Auto-refresh</label>
              </div>
            </div>
          </div>
          {loading ? <div className={`transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Loading...</div> : (
            <div className="space-y-3">
              <div>
                <label className={`block text-sm font-medium transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>USD → NGN Rate</label>
                <input inputMode="decimal" type="text" value={rate} onChange={e=>setRate(e.target.value)} className={`mt-1 p-2 border rounded w-full transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="e.g. 1550" />
              </div>
              <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                API rate preview: {loadingPreview ? 'loading...' : (externalRate ? <span className="font-medium">{externalRate}</span> : 'unavailable')}
                {externalRate && rate && Number(rate) > 0 && (
                  <span className={`ml-3 text-xs transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>diff: {Math.round(((Number(rate) - externalRate)/externalRate)*100)}%</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={()=>clearOverride(false)} disabled={saving} className={`px-4 py-2 rounded transition-colors ${isDark ? 'border border-slate-600 text-slate-50 hover:bg-slate-700 disabled:opacity-50' : 'border border-gray-300 text-gray-900 hover:bg-gray-100 disabled:opacity-50'}`}>Clear Override</button>
                {message && <div className={`text-sm transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{message}</div>}
              </div>
            </div>
          )}
        </div>
      </Container>
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className={`absolute inset-0 transition-colors ${isDark ? 'bg-black/60' : 'bg-black/40'}`} onClick={()=>setShowConfirmClear(false)} />
          <div className={`relative p-6 rounded shadow-lg w-full max-w-md transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-2 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Confirm Clear Override</h3>
            <p className={`text-sm mb-4 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Are you sure you want to clear the admin exchange-rate override? This will cause the service to use the external API or environment value.</p>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setShowConfirmClear(false)} className={`px-4 py-2 rounded transition-colors ${isDark ? 'border border-slate-600 text-slate-50 hover:bg-slate-700' : 'border border-gray-300 text-gray-900 hover:bg-gray-100'}`}>Cancel</button>
              <button onClick={()=>clearOverride(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors">Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
