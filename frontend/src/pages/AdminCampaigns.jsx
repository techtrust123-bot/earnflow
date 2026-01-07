import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from '../utils/axios'
import toast from 'react-hot-toast'
import Container from '../components/Container'

export default function AdminCampaigns(){
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState('all') // all | successful | pending | failed | notPaid

  useEffect(()=>{ fetchList() }, [])

  const [view, setView] = useState('pending') // 'pending' or 'approved'

  useEffect(()=>{ fetchList() }, [view])

  const fetchList = async () => {
    setLoading(true)
    try{
      const path = view === 'approved' ? '/campaigns/admin/approved-approvals' : '/campaigns/admin/pending-approvals'
      const res = await axios.get(path)
      setTasks(res.data.tasks || [])
    }catch(err){
      toast.error('Failed to load approval requests')
      console.error(err)
    }finally{ setLoading(false) }
  }

  const copyRef = async (ref) => {
    if (!ref) return
    try {
      await navigator.clipboard.writeText(ref)
      toast.success('Reference copied')
    } catch (err) {
      console.error(err)
      toast.error('Copy failed')
    }
  }

  const startEdit = (t) => setEditing({ ...t })
  const closeEdit = () => setEditing(null)

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try{
      const updates = {
        amount: editing.amount,
        slots: editing.slots,
        status: editing.status,
        paid: editing.paid
      }
      const res = await axios.patch(`/campaigns/admin/${editing._id}`, updates)
      toast.success('Updated')
      closeEdit()
      fetchList()
    }catch(err){
      toast.error(err.response?.data?.message || 'Update failed')
    }finally{ setSaving(false) }
  }

  const approve = async (id) => {
    try{
      await axios.patch(`/campaigns/admin/approve/${id}`, { action: 'approve' })
      toast.success('Approved')
      fetchList()
    }catch(err){ toast.error('Approve failed') }
  }

  const reject = async (id) => {
    try{
      await axios.patch(`/campaigns/admin/approve/${id}`, { action: 'reject' })
      toast.success('Rejected')
      fetchList()
    }catch(err){ toast.error('Reject failed') }
  }

  const createTasks = async (id) => {
    try{
      await axios.post(`/campaigns/admin/create-tasks/${id}`)
      toast.success('Tasks created')
      fetchList()
    }catch(err){
      toast.error(err.response?.data?.message || 'Create tasks failed')
    }
  }

  if (loading) return <div className="py-20 text-center">Loading...</div>

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <Container>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Admin — User Campaigns</h1>
          <div className="flex items-center gap-3">
            <Link to="/admin/exchange-rate/audit" className="text-sm text-indigo-600 underline">Exchange Rate Audit</Link>
          </div>
        </div>
        <div className="flex gap-3 mb-4 items-center">
          <div className="flex gap-3">
            <button onClick={()=>setView('pending')} className={`px-3 py-2 rounded ${view==='pending' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>Pending</button>
            <button onClick={()=>setView('approved')} className={`px-3 py-2 rounded ${view==='approved' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>Approved</button>
          </div>
          <div className="ml-4">
            <label className="text-sm mr-2">Payment:</label>
            <select value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)} className="p-2 border rounded">
              <option value="all">All</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="notPaid">Not Paid</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {tasks.length===0 ? <div className="bg-white p-6 rounded-lg">No approval requests</div> : (
            (() => {
              const filtered = tasks.filter(t => {
                if (paymentFilter === 'all') return true
                const status = t.payment ? (t.payment.status || 'pending') : 'notPaid'
                return status === paymentFilter
              })
              if (filtered.length === 0) return <div className="bg-white p-6 rounded-lg">No approval requests match filter</div>
              return filtered.map(t => (
                <div key={t._id} className="bg-white p-4 rounded-lg shadow flex justify-between items-start">
                  <div>
                    <div className="font-bold">{t.action.toUpperCase()} — {t.title}</div>
                    <div className="text-sm text-gray-600">Owner: {t.owner?.name || t.owner?.email} • Platform: {t.platform} • Slots: {t.numUsers}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {t.payment ? (
                        <>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${t.payment.status === 'successful' ? 'bg-green-50 text-green-700' : t.payment.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                            {t.payment.status === 'successful' ? 'Paid' : t.payment.status === 'pending' ? 'Pending' : 'Failed'}
                          </span>
                          {t.payment.paidOn && <span className="text-xs text-gray-500 ml-2">on {new Date(t.payment.paidOn).toLocaleString()}</span>}
                          {t.payment.reference && (
                            <span className="text-xs text-gray-500 ml-2">ref: {t.payment.reference} <button onClick={()=>copyRef(t.payment.reference)} className="ml-2 text-indigo-600 underline">copy</button></span>
                          )}
                        </>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700">Not Paid</span>
                      )}
                    </div>
                    {t.action !== 'follow' && t.url && <div className="text-sm text-gray-600">Post URL: {t.url}</div>}
                    {t.description && <div className="text-sm text-gray-600">Description: {t.description}</div>}
                    {t.action === 'follow' && t.socialHandle && <div className="text-sm text-gray-600">Account: {t.socialHandle}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm">Requested: <strong>{new Date(t.createdAt).toLocaleString()}</strong></div>
                    <div className="flex gap-2 mt-2">
                      {view === 'pending' && (
                        <>
                          <button onClick={()=>approve(t._id)} className="px-3 py-2 bg-green-600 text-white rounded">Approve</button>
                          <button onClick={()=>reject(t._id)} className="px-3 py-2 bg-red-500 text-white rounded">Reject</button>
                        </>
                      )}
                      {view === 'approved' && t.paid && !t._created && (
                        <button onClick={()=>createTasks(t._id)} className="px-3 py-2 bg-blue-600 text-white rounded">Create Tasks</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            })()
          )}
        </div>

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
            <div className="relative bg-white rounded-xl p-6 w-full max-w-lg mx-4 sm:mx-0">
              <h3 className="text-lg font-bold mb-3">Manage Campaign</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm">Amount</label>
                  <input type="number" value={editing.amount} onChange={e=>setEditing({...editing, amount: e.target.value})} className="w-full p-3 border rounded mt-1" />
                </div>
                <div>
                  <label className="text-sm">Slots</label>
                  <input type="number" value={editing.slots} onChange={e=>setEditing({...editing, slots: e.target.value})} className="w-full p-3 border rounded mt-1" />
                </div>
                <div>
                  <label className="text-sm">Status</label>
                  <select value={editing.status} onChange={e=>setEditing({...editing, status: e.target.value})} className="w-full p-3 border rounded mt-1">
                    <option value="pending">pending</option>
                    <option value="active">active</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editing.paid} onChange={e=>setEditing({...editing, paid: e.target.checked})} /> Paid</label>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={closeEdit} className="px-4 py-2 border rounded">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  )
}
