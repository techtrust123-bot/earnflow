import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import toast from 'react-hot-toast'
import axios from "../utils/axios"
import Container from '../components/Container'
import { isoToDatetimeLocal, datetimeLocalToISO } from '../utils/datetime'

export default function AdminTasks() {
  const { token } = useSelector(state => state.auth)
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'delete'|'toggle', task }

  // Form with new fields
  const [form, setForm] = useState({
    title: '',
    platform: '',
    reward: '',
    link: '',
    isActive: true,
    maxCompletions: 0,     // ← NEW: Limit
    completedCount: 0,        // ← Tracks how many did it
    startDate: '',            // ← ISO date (e.g., 2025-04-01T10:00)
    endDate: ''               // ← Auto-disable after this
  })
  const [editingId, setEditingId] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchTasks()
  }, [token])

  useEffect(() => {
    applyFilters()
  }, [tasks, search, filterPlatform, filterStatus])

  const applyFilters = () => {
    let filtered = tasks

    if (search) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.platform.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (filterPlatform !== 'all') filtered = filtered.filter(t => t.platform === filterPlatform)
    if (filterStatus !== 'all') {
      const active = filterStatus === 'active'
      filtered = filtered.filter(t => t.isActive === active)
    }

    setFilteredTasks(filtered)
  }


  const fetchTasks = async () => {
  setLoading(true)
  try {
    const res = await axios.get('/tasks/activeTasks')
    
    // SAFELY extract array
    let tasksArray = []
    if (Array.isArray(res.data)) {
      tasksArray = res.data
    } else if (res.data?.tasks && Array.isArray(res.data.tasks)) {
      tasksArray = res.data.tasks
    } else if (res.data?.data && Array.isArray(res.data.data)) {
      tasksArray = res.data.data
    }

    setTasks(tasksArray)
    setFilteredTasks(tasksArray)
  } catch (err) {
    console.error(err)
    toast.error('Failed to load tasks')
    setTasks([])
    setFilteredTasks([])
  } finally {
    setLoading(false)
  }
}
  // const fetchTasks = async () => {
  //   try {
  //     const res = await axios.get('/tasks/fetch')
  //     setTasks(res.data || [])
  //   } catch (err) {
  //     toast.error(err.response?.data?.message)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const required = ['title', 'platform', 'reward', 'link', 'maxCompletions']
    if (required.some(f => !form[f])) {
      toast.error('All fields required')
      return
    }

    try {
      if (editingId) {
       const response= await axios.put(`/tasks/update/${editingId}`, form)
        toast.success(response.data.message)
      } else {
       const res = await axios.post('/tasks/addtasks', form)
        toast.success(res.data.message)
      }
      resetForm()
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const resetForm = () => {
    setForm({
      title: '', platform: '', reward: '', link: '', isActive: true,
      maxCompletions: "", completedCount: 0, startDate: '', endDate: ''
    })
    setEditingId(null)
  }

  const handleEdit = (task) => {
    setForm(task)
    setEditingId(task._id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    const task = tasks.find(t => t._id === id)
    setConfirmAction({ type: 'delete', task })
  }

  const toggleActive = async (id, status) => {
    const task = tasks.find(t => t._id === id)
    setConfirmAction({ type: 'toggle', task })
  }

  const performDelete = async (task) => {
    try {
      const res = await axios.delete(`/tasks/del/${task._id}`)
      toast.success(res.data.message || 'Deleted')
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    } finally {
      setConfirmAction(null)
    }
  }

  const performToggle = async (task) => {
    try {
      const res = await axios.patch(`/tasks/${task._id}/toggle`, { isActive: !task.isActive })
      toast.success(res.data.message || `Task ${task.isActive ? 'paused' : 'activated'}`)
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setConfirmAction(null)
    }
  }

  // Check if task is expired or limit reached
  const isTaskExpired = (task) => {
    if (!task.isActive) return true
    if (task.endDate && new Date(task.endDate) < new Date()) return true
    if (task.maxCompletions && task.completedCount >= task.maxCompletions) return true
    return false
  }

  if (loading) return <div className="flex justify-center py-20"><div className="text-3xl font-bold text-purple-600 animate-pulse">Loading...</div></div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Container>
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-10 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Admin Task Management
        </h1>

        {/* Search + Filters */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="p-4 border-2 rounded-xl focus:border-purple-500 outline-none" />
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
              className="p-4 border-2 rounded-xl">
              <option value="all">All Platforms</option>
              <option value="X">X (Twitter)</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="p-4 border-2 rounded-xl">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Expired/Limited</option>
            </select>
          </div>
          <p className="mt-4 text-lg">Showing <strong>{filteredTasks.length}</strong> tasks</p>
        </div>

        {/* Create/Edit Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 mb-10">
          <h2 className="text-3xl font-bold mb-8 text-center">{editingId ? 'Edit Task' : 'Create New Task'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="p-4 border-2 rounded-xl" />
            <input type="text" placeholder="Platform" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} required className="p-4 border-2 rounded-xl" />
            <input type="number" placeholder="Reward (₦)" value={form.reward} onChange={e => setForm({...form, reward: e.target.value})} required className="p-4 border-2 rounded-xl" />
            <input type="url" placeholder="Proof Link" value={form.link} onChange={e => setForm({...form, link: e.target.value})} required className="p-4 border-2 rounded-xl" />
            <input type="number" placeholder="Max Completions (e.g., 1000)" value={form.maxCompletions} onChange={e => setForm({...form, maxCompletions: +e.target.value})} required className="p-4 border-2 rounded-xl" />
            <div className="space-y-4">
              <input type="datetime-local" placeholder="Start Time" value={isoToDatetimeLocal(form.startDate)} onChange={e => setForm({...form, startDate: datetimeLocalToISO(e.target.value)})} className="w-full p-4 border-2 rounded-xl" />
              <input type="datetime-local" placeholder="End Time" value={isoToDatetimeLocal(form.endDate)} onChange={e => setForm({...form, endDate: datetimeLocalToISO(e.target.value)})} className="w-full p-4 border-2 rounded-xl" />
            </div>
            <div className="md:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer text-lg">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="w-6 h-6" />
                <span>Active</span>
              </label>
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-5 rounded-xl font-bold text-xl hover:scale-105 transition">
                {editingId ? 'Update' : 'Create'} Task
              </button>
              {editingId && <button type="button" onClick={resetForm} className="px-8 bg-gray-500 text-white py-5 rounded-xl font-bold">Cancel</button>}
            </div>
          </form>
        </div>

        {/* Responsive Task List */}
        <div className="space-y-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-20 text-2xl text-gray-500 bg-white rounded-3xl shadow-2xl">
              No tasks match your filters
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-6">
                {filteredTasks.map(task => {
                  const expired = isTaskExpired(task)
                  return (
                    <div key={task._id} className={`bg-white rounded-3xl shadow-xl p-6 border-4 ${expired ? 'border-red-300 opacity-75' : 'border-gray-200'}`}>
                      <div className="flex justify-between mb-4">
                        <h3 className="text-xl font-bold">{task.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${expired ? 'bg-red-100 text-red-800' : task.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                          {expired ? 'Expired' : task.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p>Platform: <strong>{task.platform}</strong> • ₦{task.reward}</p>
                      <p className="text-sm text-gray-600">Completed: {task.completedCount || 0} / {task.maxCompletions || '∞'}</p>
                      {task.endDate && <p className="text-sm text-gray-600">Ends: {new Date(task.endDate).toLocaleString()}</p>}
                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <div className="flex gap-3">
                          <button onClick={() => handleEdit(task)} className="flex-1 inline-flex items-center justify-center gap-2 bg-yellow-500 text-white py-3 rounded-xl font-semibold"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Edit</button>
                          <button onClick={() => toggleActive(task._id, task.isActive)} disabled={expired} className={`px-4 py-3 rounded-xl font-semibold text-white ${expired ? 'bg-gray-400' : task.isActive ? 'bg-orange-500' : 'bg-green-500'}`}>
                            {expired ? 'Expired' : task.isActive ? 'Pause' : 'Activate'}
                          </button>
                        </div>
                        <button onClick={() => handleDelete(task._id)} className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold">Delete</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left">Title</th>
                      <th className="px-6 py-4 text-left">Platform</th>
                      <th className="px-6 py-4 text-left">Reward</th>
                      <th className="px-6 py-4 text-left">Progress</th>
                      <th className="px-6 py-4 text-left">Time</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      <th className="px-6 py-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTasks.map(task => {
                      const expired = isTaskExpired(task)
                      return (
                        <tr key={task._id} className={expired ? 'bg-red-50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-5 font-medium">{task.title}</td>
                          <td className="px-6 py-5">{task.platform}</td>
                          <td className="px-6 py-5 font-bold text-green-600">₦{task.reward}</td>
                          <td className="px-6 py-5 w-48">
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                              <div style={{ width: `${Math.min(100, Math.floor(((task.completedCount||0) / (task.maxCompletions||Infinity)) * 100))}%` }} className="h-3 bg-gradient-to-r from-green-400 to-green-600" />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{task.completedCount || 0} / {task.maxCompletions || '∞'}</div>
                          </td>
                          <td className="px-6 py-5 text-sm">
                            {task.endDate ? new Date(task.endDate).toLocaleString() : 'No limit'}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-4 py-2 rounded-full text-sm font-bold ${expired ? 'bg-red-100 text-red-800' : task.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                              {expired ? 'Expired' : task.isActive ? 'Active' : 'Paused'}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleEdit(task)} className="inline-flex items-center gap-2 bg-yellow-500 text-white px-3 py-2 rounded-md"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Edit</button>
                              <button onClick={() => toggleActive(task._id, task.isActive)} disabled={expired} className={`px-3 py-2 rounded-md text-white ${expired ? 'bg-gray-400' : task.isActive ? 'bg-orange-500' : 'bg-green-500'}`}>{expired ? 'Expired' : task.isActive ? 'Pause' : 'Activate'}</button>
                              <button onClick={() => handleDelete(task._id)} className="px-3 py-2 rounded-md bg-red-500 text-white">Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </Container>
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction.type === 'delete') performDelete(confirmAction.task)
            else if (confirmAction.type === 'toggle') performToggle(confirmAction.task)
          }}
        />
      )}
    </div>
  )
}

// Confirm modal component (simple, local)
function ConfirmModal({ action, onConfirm, onCancel }) {
  if (!action) return null
  const { type, task } = action
  const title = type === 'delete' ? 'Delete task' : 'Change status'
  const message = type === 'delete' ? `Delete "${task.title}" permanently?` : `${task.isActive ? 'Pause' : 'Activate'} "${task.title}"?`
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-6 shadow-xl max-w-md w-full mx-4 sm:mx-0">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-md border">Cancel</button>
          <button onClick={() => { onConfirm && onConfirm(); }} className="px-4 py-2 rounded-md bg-red-600 text-white">Confirm</button>
        </div>
      </div>
    </div>
  )
}