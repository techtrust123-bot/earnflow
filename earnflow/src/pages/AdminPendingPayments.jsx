import { useEffect, useState } from 'react'
import axios from '../utils/axios'
import Container from '../components/Container'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function AdminPendingPayments(){
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDebug, setActiveDebug] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [query, setQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const navigate = useNavigate()

  const load = async (p = 1) =>{
    setLoading(true)
    try{
      const params = { page: p, limit: pageSize }
      if (query) params.q = query
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await axios.get('/campaigns/admin/pending', { params })
      setTasks(res.data.tasks || [])
      setPage(res.data.page || p)
      setTotalPages(res.data.totalPages || 1)
    }catch(err){
      toast.error(err.response?.data?.message || 'Could not load pending tasks')
    }finally{ setLoading(false) }
  }

  useEffect(()=>{ load(1) }, [pageSize])

  const viewDebug = async (id)=>{
    try{
      const res = await axios.get(`/campaigns/admin/debug/${id}`)
      setActiveDebug({ id, data: res.data.task })
    }catch(err){
      toast.error(err.response?.data?.message || 'Could not fetch debug info')
    }
  }

  const verify = async (taskId)=>{
    try{
      const res = await axios.post('/campaigns/verify', { taskId })
      toast.success('Verify call returned')
      // show response in debug panel
      setActiveDebug({ id: taskId, data: { verification: res.data.verification, verifyRef: res.data.verifyRef } })
    }catch(err){
      toast.error(err.response?.data?.message || 'Verify failed')
    }
  }

  const manualActivate = async (taskId)=>{
    try{
      const res = await axios.post('/campaigns/confirm-payment', { taskId })
      toast.success('Task marked active')
      load()
    }catch(err){
      toast.error(err.response?.data?.message || 'Could not activate')
    }
  }

  if (loading) return <div className="py-20 text-center">Loading...</div>

  return (
    <div className="min-h-screen">
      <Container>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Pending Payments</h2>
          <div className="mb-4 text-sm text-gray-600">List of tasks awaiting payment confirmation. Use verify or inspect paymentResponse.</div>

          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <input placeholder="Search owner name or email" value={query} onChange={e=>setQuery(e.target.value)} className="rounded border p-2" />
            <label className="text-sm">From</label>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="rounded border p-2" />
            <label className="text-sm">To</label>
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="rounded border p-2" />
            <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} className="rounded border p-2">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button onClick={() => load(1)} className="px-3 py-2 bg-indigo-600 text-white rounded">Apply</button>
          </div>

          {tasks.length === 0 ? (
            <div className="p-6 bg-white rounded shadow">No pending tasks</div>
          ) : (
            <div className="space-y-4">
              {tasks.map(t => (
                <div key={t._id} className="p-4 bg-white rounded shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{t.action} — {t._id}</div>
                      <div className="text-sm text-gray-600">Owner: {t.owner?.name} — {t.owner?.email}</div>
                      <div className="text-sm text-gray-700">Amount: {t.currency === 'NGN' ? '₦' : '$'}{t.totalCost} • Slots: {t.slots}</div>
                      <div className="text-xs text-gray-500">paymentReference: {t.paymentReference} • providerReference: {t.providerReference || '—'}</div>
                      <div className="text-xs text-gray-400">Created: {new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => viewDebug(t._id)} className="px-3 py-2 bg-gray-100 rounded">Inspect</button>
                      <button onClick={() => verify(t._id)} className="px-3 py-2 bg-indigo-600 text-white rounded">Verify</button>
                      <button onClick={() => manualActivate(t._id)} className="px-3 py-2 bg-green-600 text-white rounded">Activate</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDebug && (
            <>
              <div className="mt-6 bg-white p-4 rounded shadow">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold">Debug: {activeDebug.id}</div>
                  <button onClick={() => setActiveDebug(null)} className="text-sm text-gray-500">Close</button>
                </div>
                <pre className="text-xs overflow-auto max-h-96 bg-gray-50 p-2 rounded">{JSON.stringify(activeDebug.data, null, 2)}</pre>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-2 bg-gray-100 rounded">Prev</button>
                  <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="px-3 py-2 bg-gray-100 rounded">Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </Container>
    </div>
  )
}
