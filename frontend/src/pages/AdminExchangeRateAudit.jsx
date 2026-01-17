import { useEffect, useState } from 'react'
import axios from '../utils/axios'
import Container from '../components/Container'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

export default function AdminExchangeRateAudit(){
  const { isDark } = useTheme()
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = async (p=1)=>{
    setLoading(true)
    try{
      const res = await axios.get('/admin/settings/exchange-rate/audit', { params: { page: p, limit: 25 } })
      if (res.data && res.data.success) {
        setAudits(res.data.audits || [])
        setPage(res.data.page || 1)
        setTotalPages(res.data.totalPages || 1)
      }
    }catch(err){
      console.error(err)
      toast.error('Failed to load audits')
    }finally{ setLoading(false) }
  }

  useEffect(()=>{ load(1) }, [])

  return (
    <div className={`min-h-screen p-6 transition-colors ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gray-50'}`}>
      <Container>
        <h2 className={`text-xl font-bold mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Exchange Rate — Audit History</h2>
        <div className={`p-4 rounded shadow transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
          {loading ? <div className={isDark ? 'text-slate-400' : ''}>Loading...</div> : (
            <div className="space-y-3">
              {audits.length===0 ? <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>No audit entries</div> : (
                <ul className={`divide-y ${isDark ? 'divide-slate-700' : ''}`}>
                  {audits.map(a => (
                    <li key={a._id} className={`py-2 transition-colors ${isDark ? 'text-slate-300' : ''}`}>
                      <div className="text-sm">
                        <strong>{a.changedBy?.name || a.changedBy?.email || 'System'}</strong>
                        <span className={`text-xs ml-2 transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{new Date(a.changedAt).toLocaleString()}</span>
                      </div>
                      <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-700'}`}>{a.oldValue || '—'} → {a.newValue || '—'}</div>
                      {a.note && <div className={`text-xs transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{a.note}</div>}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between">
                <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Page {page} of {totalPages}</div>
                <div className="flex gap-2">
                  <button disabled={page<=1} onClick={()=>load(page-1)} className={`px-3 py-1 border rounded transition-colors ${isDark ? 'border-slate-600 bg-slate-700 text-slate-50 hover:bg-slate-600 disabled:opacity-50' : 'border-gray-300 hover:bg-gray-50'}`}>Prev</button>
                  <button disabled={page>=totalPages} onClick={()=>load(page+1)} className={`px-3 py-1 border rounded transition-colors ${isDark ? 'border-slate-600 bg-slate-700 text-slate-50 hover:bg-slate-600 disabled:opacity-50' : 'border-gray-300 hover:bg-gray-50'}`}>Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
