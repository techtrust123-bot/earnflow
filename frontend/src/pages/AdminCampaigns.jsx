import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from '../utils/axios'
import toast from 'react-hot-toast'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

export default function AdminCampaigns(){
  const { isDark } = useTheme()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState('all') // all | successful | pending | failed | notPaid

  // Get base URL for image requests
  const getImageUrl = (screenshotPath) => {
    if (!screenshotPath) return null
    if (screenshotPath.startsWith('http')) return screenshotPath
    const baseUrl = window.location.origin
    return `${baseUrl}${screenshotPath}`
  }
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

  if (loading) return <div className={`py-20 text-center transition-colors ${isDark ? 'min-h-screen bg-slate-900 text-slate-400' : ''}`}>Loading...</div>

  return (
    <div className={`min-h-screen p-6 transition-colors ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gray-50'}`}>
      <Container>
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Admin — User Campaigns</h1>
          <div className="flex items-center gap-3">
            <Link to="/admin/exchange-rate/audit" className={`text-sm underline transition-colors ${isDark ? 'text-blue-400' : 'text-indigo-600'}`}>Exchange Rate Audit</Link>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={()=>setView('pending')} className={`px-3 py-2 rounded transition-colors ${view==='pending' ? 'bg-indigo-600 text-white' : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white hover:bg-gray-50')}`}>Pending</button>
            <button onClick={()=>setView('approved')} className={`px-3 py-2 rounded transition-colors ${view==='approved' ? 'bg-indigo-600 text-white' : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white hover:bg-gray-50')}`}>Approved</button>
          </div>
          <div className="ml-0 sm:ml-4 w-full sm:w-auto">
            <label className={`text-sm mr-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>Payment:</label>
            <select value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)} className={`p-2 border rounded w-full sm:w-auto transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`}>
              <option value="all">All</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="notPaid">Not Paid</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {tasks.length===0 ? <div className={`p-6 rounded-lg transition-colors ${isDark ? 'bg-slate-800 border border-slate-700 text-slate-400' : 'bg-white'}`}>No approval requests</div> : (
            (() => {
              const filtered = tasks.filter(t => {
                if (paymentFilter === 'all') return true
                const status = t.payment ? (t.payment.status || 'pending') : 'notPaid'
                return status === paymentFilter
              })
              if (filtered.length === 0) return <div className={`p-6 rounded-lg transition-colors ${isDark ? 'bg-slate-800 border border-slate-700 text-slate-400' : 'bg-white'}`}>No approval requests match filter</div>
              return filtered.map(t => (
                <div key={t._id} className={`p-4 rounded-lg shadow flex flex-col lg:flex-row justify-between items-start gap-4 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold transition-colors ${isDark ? 'text-slate-50' : ''}`}>{t.action.toUpperCase()} — {t.title}</div>
                    <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Owner: {t.owner?.name || t.owner?.email} • Platform: {t.platform} • Slots: {t.numUsers}</div>
                    <div className={`text-sm mt-1 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      {t.payment ? (
                        <>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold transition-colors ${t.payment.status === 'successful' ? (isDark ? 'bg-green-900 text-green-300' : 'bg-green-50 text-green-700') : t.payment.status === 'pending' ? (isDark ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-50 text-yellow-700') : (isDark ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-700')}`}>
                            {t.payment.status === 'successful' ? 'Paid' : t.payment.status === 'pending' ? 'Pending' : 'Failed'}
                          </span>
                          {t.payment.paidOn && <span className={`text-xs ml-2 transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>on {new Date(t.payment.paidOn).toLocaleString()}</span>}
                          {t.payment.reference && (
                            <span className={`text-xs ml-2 transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>ref: {t.payment.reference} <button onClick={()=>copyRef(t.payment.reference)} className={`ml-2 underline transition-colors ${isDark ? 'text-blue-400' : 'text-indigo-600'}`}>copy</button></span>
                          )}
                        </>
                      ) : (
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold transition-colors ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Not Paid</span>
                      )}
                    </div>
                    {t.action !== 'follow' && t.url && <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Post URL: {t.url}</div>}
                    {t.description && <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Description: {t.description}</div>}
                    {t.accountUsername && <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Account Username: <strong>{t.accountUsername}</strong></div>}
                    {t.action === 'follow' && t.socialHandle && <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Account: {t.socialHandle}</div>}
                    
                    {/* Screenshot Display */}
                    {t.screenshotUrl && (
                      <div className="mt-3 w-full">
                        <p className={`text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Screenshot:</p>
                        <img 
                            src={getImageUrl(t.screenshotUrl)} 
                          alt="Task screenshot" 
                          className={`w-full max-w-xs h-auto rounded border transition-colors ${isDark ? 'border-slate-600' : 'border-gray-200'} object-contain`}
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2216%22 fill=%22%23999%22%3EImage not found%3C/text%3E%3C/svg%3E'
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:items-end gap-2 w-full lg:w-auto">
                    <div className={`text-sm transition-colors ${isDark ? 'text-slate-300' : ''}`}>Requested: <strong>{new Date(t.createdAt).toLocaleString()}</strong></div>
                    <div className="flex gap-2 mt-2 flex-wrap lg:flex-nowrap">
                      {view === 'pending' && (
                        <>
                          <button onClick={()=>approve(t._id)} className="px-3 py-2 bg-green-600 text-white rounded text-sm whitespace-nowrap hover:bg-green-700 transition">Approve</button>
                          <button onClick={()=>reject(t._id)} className="px-3 py-2 bg-red-500 text-white rounded text-sm whitespace-nowrap hover:bg-red-600 transition">Reject</button>
                        </>
                      )}
                      {view === 'approved' && t.paid && !t._created && (
                        <button onClick={()=>createTasks(t._id)} className="px-3 py-2 bg-blue-600 text-white rounded text-sm whitespace-nowrap hover:bg-blue-700 transition">Create Tasks</button>
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
            <div className={`relative rounded-xl p-6 w-full max-w-lg mx-4 sm:mx-0 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
              <h3 className={`text-lg font-bold mb-3 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Manage Campaign</h3>
              <div className="space-y-3">
                <div>
                  <label className={`text-sm transition-colors ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>Amount</label>
                  <input type="number" value={editing.amount} onChange={e=>setEditing({...editing, amount: e.target.value})} className={`w-full p-3 border rounded mt-1 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`} />
                </div>
                <div>
                  <label className={`text-sm transition-colors ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>Slots</label>
                  <input type="number" value={editing.slots} onChange={e=>setEditing({...editing, slots: e.target.value})} className={`w-full p-3 border rounded mt-1 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`} />
                </div>
                <div>
                  <label className={`text-sm transition-colors ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>Status</label>
                  <select value={editing.status} onChange={e=>setEditing({...editing, status: e.target.value})} className={`w-full p-3 border rounded mt-1 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`}>
                    <option value="pending">pending</option>
                    <option value="active">active</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-900'}`}><input type="checkbox" checked={editing.paid} onChange={e=>setEditing({...editing, paid: e.target.checked})} /> Paid</label>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={closeEdit} className={`px-4 py-2 border rounded transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 hover:bg-gray-50'}`}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} className={`px-4 py-2 text-white rounded transition-colors ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  )
}
