// src/pages/AdminTasks.jsx
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

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/tasks/activeTasks')
      
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
          // Correct field based on type
          ...(form.verificationType === 'follow' 
            ? { targetId: form.target.trim() }
            : { targetTweetId: form.target.trim() }
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

  if (loading) return <div className="flex justify-center py-20"><div className="text-3xl font-bold text-purple-600 animate-pulse">Loading...</div></div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Container>
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-10 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Admin Task Management
        </h1>

        {/* ... your search/filter section ... */}

        {/* Create/Edit Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 mb-10">
          <h2 className="text-3xl font-bold mb-8 text-center">{editingId ? 'Edit Task' : 'Create New Task'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="p-4 border-2 rounded-xl" />
            <input type="text" placeholder="Platform (e.g., X, Instagram)" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} required className="p-4 border-2 rounded-xl" />
            <input type="number" placeholder="Reward (₦)" value={form.reward} onChange={e => setForm({...form, reward: e.target.value})} required className="p-4 border-2 rounded-xl" />
            <input type="url" placeholder="Proof Link" value={form.link} onChange={e => setForm({...form, link: e.target.value})} required className="p-4 border-2 rounded-xl" />
            <input type="number" placeholder="Max Completions (0 = unlimited)" value={form.maxCompletions} onChange={e => setForm({...form, maxCompletions: e.target.value})} required className="p-4 border-2 rounded-xl" />
            
            <div className="space-y-4">
              <input type="datetime-local" placeholder="Start Time" value={isoToDatetimeLocal(form.startDate)} onChange={e => setForm({...form, startDate: datetimeLocalToISO(e.target.value)})} className="w-full p-4 border-2 rounded-xl" />
              <input type="datetime-local" placeholder="End Time" value={isoToDatetimeLocal(form.endDate)} onChange={e => setForm({...form, endDate: datetimeLocalToISO(e.target.value)})} className="w-full p-4 border-2 rounded-xl" />
            </div>

            {/* REQUIRED VERIFICATION SECTION */}
            <div className="md:col-span-2 bg-blue-50 p-6 rounded-2xl">
              <h3 className="text-xl font-bold mb-4 text-blue-800">Automatic Verification (Required)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Verification Type *</label>
                  <select
                    value={form.verificationType}
                    onChange={e => setForm({...form, verificationType: e.target.value, target: ''})} // Clear target when type changes
                    required
                    className="w-full p-4 border-2 rounded-xl"
                  >
                    <option value="">Select verification type</option>
                    <option value="follow">Follow</option>
                    <option value="like">Like</option>
                    <option value="retweet">Retweet</option>
                    <option value="repost">Repost</option>
                    <option value="comment">Comment</option>
                  </select>
                </div>

                {form.verificationType && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {form.verificationType === 'follow' ? 'Username (without @)' : 'Tweet/Post ID'} *
                    </label>
                    <input
                      type="text"
                      value={form.target}
                      onChange={e => setForm({...form, target: e.target.value})}
                      placeholder={form.verificationType === 'follow' ? 'earnflow' : '1234567890123456789'}
                      required
                      className="w-full p-4 border-2 rounded-xl"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      {form.verificationType === 'follow' 
                        ? 'Enter username only (e.g., earnflow)' 
                        : 'Copy the number from the tweet URL'}
                    </p>
                  </div>
                )}
              </div>
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

        {/* ... rest of your task list ... */}
      </Container>
    </div>
  )
}