import { useEffect, useState } from 'react'
import axios from '../utils/axios'
import Container from '../components/Container'
import toast from 'react-hot-toast'

export default function AdminExchangeRateAudit(){
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
    <div className="min-h-screen p-6 bg-gray-50">
      <Container>
        <h2 className="text-xl font-bold mb-4">Exchange Rate — Audit History</h2>
        <div className="bg-white p-4 rounded shadow">
          {loading ? <div>Loading...</div> : (
            <div className="space-y-3">
              {audits.length===0 ? <div className="text-sm text-gray-600">No audit entries</div> : (
                <ul className="divide-y">
                  {audits.map(a => (
                    <li key={a._id} className="py-2">
                      <div className="text-sm">
                        <strong>{a.changedBy?.name || a.changedBy?.email || 'System'}</strong>
                        <span className="text-xs text-gray-500 ml-2">{new Date(a.changedAt).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-gray-700">{a.oldValue || '—'} → {a.newValue || '—'}</div>
                      {a.note && <div className="text-xs text-gray-500">{a.note}</div>}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
                <div className="flex gap-2">
                  <button disabled={page<=1} onClick={()=>load(page-1)} className="px-3 py-1 border rounded">Prev</button>
                  <button disabled={page>=totalPages} onClick={()=>load(page+1)} className="px-3 py-1 border rounded">Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
