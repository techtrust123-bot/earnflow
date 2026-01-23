// src/pages/AdminTasks.jsx
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import axios from "../utils/axios"
import Container from '../components/Container'
import { isoToDatetimeLocal, datetimeLocalToISO } from '../utils/datetime'
import { useTheme } from '../context/ThemeContext'

export default function AdminTasks() {
  const { token } = useSelector(state => state.auth)
  const { isDark } = useTheme()
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState(null)

  const [form, setForm] = useState({
    title: '',
    platform: '',
    reward: '',
    link: '',
    isActive: true,
    maxCompletions: '',
    startDate: '',
    endDate: '',
    verificationType: '',
    target: ''
  })
  const [editingId, setEditingId] = useState(null)

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

  // const fetchTasks = async () => {
  //   setLoading(true)
  //   try {
  //     const res = await axios.get('/tasks/activeTasks')
      
  //     let tasksArray = []
  //     if (Array.isArray(res.data)) {
  //       tasksArray = res.data
  //     } else if (res.data?.tasks && Array.isArray(res.data.tasks)) {
  //       tasksArray = res.data.tasks
  //     } else if (res.data?.data && Array.isArray(res.data.data)) {
  //       tasksArray = res.data.data
  //     }

  //     setTasks(tasksArray)
  //     setFilteredTasks(tasksArray)
  //   } catch (err) {
  //     console.error(err)
  //     toast.error('Failed to load tasks')
  //     setTasks([])
  //     setFilteredTasks([])
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // const handleDelete = async (taskId) => {
  //   try {
  //     const del = await axios.delete(`/tasks/delete/${taskId}`)
  //   setTasks(prev => prev.filter(task => task._id !== taskId))
  //   toast.success(del.data.message || 'Task deleted')
  //   } catch (error) {
  //     console.error("Delete error:", error)
  //     toast.error(error.response?.data?.message || 'Failed to delete task')
  //   } 
  // }   

  // const toggleActive = async (taskId, currentStatus) => {
  //   try {
  //     const res = await axios.patch(`/tasks/toggle/${taskId}`)
  //     setTasks(prev => prev.map(t => t._id === taskId ? { ...t, isActive: !currentStatus } : t))
  //     toast.success(res.data.message || 'Task status updated')
  //   } catch (error) {
  //     console.error("Toggle error:", error)
  //     toast.error(error.response?.data?.message || 'Failed to update task status')
  //   }
  // }

  const handleDelete = (task) => {
    setConfirmAction({ type: 'delete', task })
  }

  const toggleActive = (task) => {
    setConfirmAction({ type: 'toggle', task })
  }

  const fetchTasks = async () => {
  setLoading(true)
  try {
    const res = await axios.get('/tasks/activeTasks',{
         params: { _t: Date.now() }
    })  // ← Keep this exact path


    
    console.log("Backend response:", res.data)  // ← ADD THIS FOR DEBUG
    
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
    console.error("Fetch error:", err.response?.data || err)
    toast.error('Failed to load tasks')
    setTasks([])
    setFilteredTasks([])
  } finally {
    setLoading(false)
  }
}

  // perform actions (delete/toggle) using the selected task object
  const performDelete = async (task) => {
    try {
      await axios.delete(`/tasks/del/${task._id}`)
      toast.success('Task deleted')
      fetchTasks()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error(err.response?.data?.message || 'Failed to delete')
    } finally {
      setConfirmAction(null)
    }
  }

  const performToggle = async (task) => {
    try {
      await axios.patch(`/tasks/${task._id}/toggle`, { isActive: !task.isActive })
      toast.success('Task status updated')
      fetchTasks()
    } catch (err) {
      console.error('Toggle error:', err)
      toast.error(err.response?.data?.message || 'Failed to update status')
    } finally {
      setConfirmAction(null)
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()

    const required = ['title', 'platform', 'reward', 'link', 'maxCompletions', 'verificationType']
    if (required.some(f => !form[f])) {
      toast.error('All fields are required, including verification type')
      return
    }

    if (!form.target.trim()) {
      toast.error('Target ID is required')
      return
    }

    try {
      const payload = {
        title: form.title.trim(),
        platform: form.platform.trim(),
        reward: Number(form.reward),
        link: form.link.trim(),
        maxCompletions: form.maxCompletions === '' ? 0 : Number(form.maxCompletions),
        isActive: form.isActive,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        verification: {
          type: form.verificationType,
          // Platform-specific field mapping
          ...(form.verificationType === 'follow' || form.verificationType === 'subscribe'
            ? { targetId: form.target.trim() }
            : form.platform === 'YouTube'
            ? { targetVideoId: form.target.trim() }
            : { targetPostId: form.target.trim() }
          )
        }
      }

      if (editingId) {
        const response = await axios.put(`/tasks/update/${editingId}`, payload)
        toast.success(response.data.message || 'Task updated')
      } else {
        const res = await axios.post('/tasks/addtasks', payload)
        toast.success(res.data.message || 'Task created')
      }

      resetForm()
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task')
    }
  }

  const resetForm = () => {
    setForm({
      title: '',
      platform: '',
      reward: '',
      link: '',
      isActive: true,
      maxCompletions: '',
      startDate: '',
      endDate: '',
      verificationType: '',
      target: ''
    })
    setEditingId(null)
  }

  const handleEdit = (task) => {
    setForm({
      title: task.title || '',
      platform: task.platform || '',
      reward: task.reward || '',
      link: task.link || '',
      isActive: task.isActive ?? true,
      maxCompletions: task.maxCompletions || '',
      startDate: isoToDatetimeLocal(task.startDate),
      endDate: isoToDatetimeLocal(task.endDate),
      verificationType: task.verification?.type || '',
      target: task.verification?.targetId || task.verification?.targetTweetId || ''
    })
    setEditingId(task._id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ... your existing delete/toggle functions ...

  const isTaskExpired = (task) => {
    if (!task.isActive) return true
    if (task.endDate && new Date(task.endDate) < new Date()) return true
    if (task.maxCompletions && task.completedCount >= task.maxCompletions) return true
    return false
  }

  if (loading) return <div className={`flex justify-center py-20 min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gray-50'} transition-colors`}><div className="text-3xl font-bold text-purple-600 animate-pulse">Loading...</div></div>

  // split filtered tasks into active vs completed
  // Prefer backend-provided completion flags: `isCompleted`, `completed`, or `status === 'completed'`.
  // Fallback to maxCompletions comparison if no backend flag is present.
  const isBackendCompleted = (t) => {
    return !!(t.isCompleted || t.completed || (typeof t.status === 'string' && t.status.toLowerCase() === 'completed'))
  }

  const activeTasks = filteredTasks.filter(t => {
    if (isBackendCompleted(t)) return false
    if (t.maxCompletions && t.maxCompletions > 0 && (t.completedCount || 0) >= t.maxCompletions) return false
    return true
  })

  const completedTasks = filteredTasks.filter(t => {
    if (isBackendCompleted(t)) return true
    if (t.maxCompletions && t.maxCompletions > 0 && (t.completedCount || 0) >= t.maxCompletions) return true
    return false
  })

  return (
    <div className={`min-h-screen p-4 md:p-8 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gray-50'} transition-colors`}>
      <Container>
        <h1 className={`text-4xl md:text-5xl font-extrabold text-center mb-10 ${isDark ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-gradient-to-r from-blue-600 to-purple-600'} bg-clip-text text-transparent`}>
          Admin Task Management
        </h1>

        {/* Create/Edit Form */}
        <div className={`rounded-3xl shadow-2xl p-6 md:p-10 mb-10 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
          <h2 className={`text-3xl font-bold mb-8 text-center transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>{editingId ? 'Edit Task' : 'Create New Task'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className={`p-4 border-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`} />
            <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value, verificationType: ''})} required className={`p-4 border-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`}>
              <option value="">Select Platform</option>
              <option value="X">X (Twitter)</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="Facebook">Facebook</option>
              <option value="YouTube">YouTube</option>
            </select>
            <input type="number" placeholder="Reward (₦)" value={form.reward} onChange={e => setForm({...form, reward: e.target.value})} required className={`p-4 border-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`} />
            <input type="url" placeholder="Proof Link" value={form.link} onChange={e => setForm({...form, link: e.target.value})} required className={`p-4 border-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`} />
            <input type="number" placeholder="Max Completions (0 = unlimited)" value={form.maxCompletions} onChange={e => setForm({...form, maxCompletions: e.target.value})} required className={`p-4 border-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`} />
            
            <div className="space-y-4">
              <input type="datetime-local" placeholder="Start Time" value={isoToDatetimeLocal(form.startDate)} onChange={e => setForm({...form, startDate: datetimeLocalToISO(e.target.value)})} className={`w-full p-4 border-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`} />
              <input type="datetime-local" placeholder="End Time" value={isoToDatetimeLocal(form.endDate)} onChange={e => setForm({...form, endDate: datetimeLocalToISO(e.target.value)})} className={`w-full p-4 border-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`} />
            </div>

            {/* REQUIRED VERIFICATION SECTION */}
            <div className={`md:col-span-2 p-6 rounded-2xl transition-colors ${isDark ? 'bg-slate-700 border border-slate-600' : 'bg-blue-50'}`}>
              <h3 className={`text-xl font-bold mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-blue-800'}`}>Automatic Verification (Required)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Verification Type *</label>
                  <select
                    value={form.verificationType}
                    onChange={e => setForm({...form, verificationType: e.target.value, target: ''})}
                    required
                    className={`w-full p-4 border-2 rounded-xl transition-colors ${isDark ? 'bg-slate-600 border-slate-500 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`}
                  >
                    <option value="">Select verification type</option>
                    {form.platform === 'YouTube' ? (
                      <>
                        <option value="subscribe">Subscribe</option>
                        <option value="like">Like</option>
                        <option value="comment">Comment</option>
                      </>
                    ) : (
                      <>
                        <option value="follow">Follow</option>
                        <option value="like">Like</option>
                        <option value="retweet">Retweet</option>
                        <option value="repost">Repost</option>
                        <option value="comment">Comment</option>
                        <option value="share">Share</option>
                      </>
                    )}
                  </select>
                </div>

                {form.verificationType && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {form.verificationType === 'follow' || form.verificationType === 'subscribe' 
                        ? `${form.platform === 'YouTube' ? 'Channel' : 'Account'} Name/ID` 
                        : form.platform === 'YouTube' 
                        ? 'Video ID' 
                        : 'Post/Tweet ID'} *
                    </label>
                    <input
                      type="text"
                      value={form.target}
                      onChange={e => setForm({...form, target: e.target.value})}
                      placeholder={form.verificationType === 'follow' || form.verificationType === 'subscribe' 
                        ? 'username or channel_id' 
                        : 'post_id_or_tweet_id'}
                      required
                      className={`w-full p-4 border-2 rounded-xl transition-colors ${isDark ? 'bg-slate-600 border-slate-500 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                    <p className={`text-xs mt-2 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      {form.verificationType === 'follow' || form.verificationType === 'subscribe'
                        ? 'Enter account/channel name or ID'
                        : `Enter the unique ID from the ${form.platform} ${form.platform === 'YouTube' ? 'video' : 'post'} URL`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 flex items-center gap-4">
              <label className={`flex items-center gap-3 cursor-pointer text-lg transition-colors ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
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
          {activeTasks.length + completedTasks.length === 0 ? (
            <div className={`text-center py-20 text-2xl rounded-3xl shadow-2xl transition-colors ${isDark ? 'bg-slate-800 border border-slate-700 text-slate-400' : 'text-gray-500 bg-white'}`}>
              No tasks match your filters
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-6">
                {activeTasks.map(task => {
                  const expired = isTaskExpired(task)
                  return (
                    <div key={task._id} className={`rounded-3xl shadow-xl p-6 border-4 transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'} ${expired ? (isDark ? 'opacity-75' : 'border-red-300 opacity-75') : (isDark ? 'border-slate-600' : 'border-gray-200')}`}>
                      <div className="flex justify-between mb-4">
                        <h3 className={`text-xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>{task.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold transition-colors ${expired ? 'bg-red-100 text-red-800' : task.isActive ? (isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100')}`}>
                          {expired ? 'Expired' : task.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className={`transition-colors ${isDark ? 'text-slate-400' : 'text-gray-700'}`}>Platform: <strong className={isDark ? 'text-slate-300' : ''}>{task.platform}</strong> • ₦{task.reward}</p>
                      <p className={`text-sm transition-colors ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>Completed: {task.completedCount || 0} / {task.maxCompletions || '∞'}</p>
                      {task.endDate && <p className={`text-sm transition-colors ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>Ends: {new Date(task.endDate).toLocaleString()}</p>}
                          <div className="mt-4 grid grid-cols-1 gap-3">
                        <div className="flex gap-3">
                          <button onClick={() => handleEdit(task)} className="flex-1 inline-flex items-center justify-center gap-2 bg-yellow-500 text-white py-3 rounded-xl font-semibold hover:bg-yellow-600 transition-colors"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Edit</button>
                          <button onClick={() => toggleActive(task)} disabled={expired} className={`px-4 py-3 rounded-xl font-semibold text-white transition-colors ${expired ? 'bg-gray-400' : task.isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}>
                            {expired ? 'Expired' : task.isActive ? 'Pause' : 'Activate'}
                          </button>
                        </div>
                        <button onClick={() => handleDelete(task)} className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors">Delete</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table */}
              <div className={`hidden md:block rounded-3xl shadow-2xl overflow-hidden transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
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
                  <tbody className={`divide-y transition-colors ${isDark ? 'divide-slate-700' : ''}`}>
                    {activeTasks.map(task => {
                      const expired = isTaskExpired(task)
                      return (
                        <tr key={task._id} className={`transition-colors ${expired ? (isDark ? 'bg-red-950' : 'bg-red-50') : (isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50')}`}>
                          <td className={`px-6 py-5 font-medium transition-colors ${isDark ? 'text-slate-50' : ''}`}>{task.title}</td>
                          <td className={`px-6 py-5 transition-colors ${isDark ? 'text-slate-300' : ''}`}>{task.platform}</td>
                          <td className={`px-6 py-5 font-bold transition-colors ${isDark ? 'text-emerald-400' : 'text-green-600'}`}>₦{task.reward}</td>
                          <td className="px-6 py-5 w-48">
                            <div className={`w-full rounded-full h-3 overflow-hidden transition-colors ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                              <div style={{ width: `${Math.min(100, Math.floor(((task.completedCount||0) / (task.maxCompletions||Infinity)) * 100))}%` }} className="h-3 bg-gradient-to-r from-green-400 to-green-600" />
                            </div>
                            <div className={`text-xs mt-1 transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{task.completedCount || 0} / {task.maxCompletions || '∞'}</div>
                          </td>
                          <td className={`px-6 py-5 text-sm transition-colors ${isDark ? 'text-slate-400' : ''}`}>
                            {task.endDate ? new Date(task.endDate).toLocaleString() : 'No limit'}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${expired ? 'bg-red-100 text-red-800' : task.isActive ? (isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100')}`}>
                              {expired ? 'Expired' : task.isActive ? 'Active' : 'Paused'}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleEdit(task)} className="inline-flex items-center gap-2 bg-yellow-500 text-white px-3 py-2 rounded-md hover:bg-yellow-600 transition-colors"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Edit</button>
                              <button onClick={() => toggleActive(task)} disabled={expired} className={`px-3 py-2 rounded-md text-white transition-colors ${expired ? 'bg-gray-400' : task.isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}>{expired ? 'Expired' : task.isActive ? 'Pause' : 'Activate'}</button>
                              <button onClick={() => handleDelete(task)} className="px-3 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  </table>
                </div>
              </div>
              {/* Completed Tasks Section */}
              {completedTasks.length > 0 && (
                <div className={`rounded-3xl shadow-2xl p-6 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                  <h2 className={`text-2xl font-bold mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Completed Tasks</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {completedTasks.map(task => (
                      <div key={task._id} className={`rounded-2xl p-4 border transition-colors ${isDark ? 'bg-slate-700 border-green-900 text-slate-50' : 'bg-green-50 border-green-100'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold">{task.title}</h3>
                            <div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{task.platform} • ₦{task.reward}</div>
                            <div className={`text-xs transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Completed: {task.completedCount || 0} / {task.maxCompletions || '∞'}</div>
                          </div>
                          <div className={`font-bold transition-colors ${isDark ? 'text-green-400' : 'text-green-700'}`}>Completed ✓</div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => handleDelete(task)} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {/* ... rest of your task list ... */}
      </Container>
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction.type === 'delete') performDelete(confirmAction.task)
            else if (confirmAction.type === 'toggle') performToggle(confirmAction.task)
          }}
          isDark={isDark}
        />
      )}
    </div>
  )
}

// Confirm modal component (simple, local)
function ConfirmModal({ action, onConfirm, onCancel, isDark }) {
  if (!action) return null
  const { type, task } = action
  const title = type === 'delete' ? 'Delete task' : 'Change status'
  const message = type === 'delete' ? `Delete "${task.title}" permanently?` : `${task.isActive ? 'Pause' : 'Activate'} "${task.title}"?`
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className={`relative rounded-2xl p-6 shadow-xl max-w-md w-full mx-4 sm:mx-0 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-2 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>{title}</h3>
        <p className={`text-sm mb-4 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className={`px-4 py-2 rounded-md border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 hover:bg-gray-50'}`}>Cancel</button>
          <button onClick={() => { onConfirm && onConfirm(); }} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">Confirm</button>
        </div>
      </div>
    </div>
  )
}