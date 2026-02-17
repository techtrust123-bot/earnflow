// src/pages/Tasks.jsx
import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { updateBalance } from '../features/auth/authSlice'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import axios from '../utils/axios'
import Container from '../components/Container'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function Tasks() {
  const dispatch = useDispatch()
  const { balance = 0 } = useSelector(state => state.auth)
  const { isDark } = useTheme()

  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')

  // ALL HOOKS MUST BE INSIDE THE COMPONENT
  const [tasks, setTasks] = useState([])
  const [completedTasks, setCompletedTasks] = useState([])
  const [completedTaskObjects, setCompletedTaskObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingTask, setProcessingTask] = useState(null)
  const navigate = useNavigate()
  const [pendingConfirm, setPendingConfirm] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [lastCompleted, setLastCompleted] = useState(null)


  // completedTasks are tracked from backend responses; no client persistence

  // Fetch tasks from backend
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)
      try {
        const res = await axios.get('/tasks/activeTasks')  // backend route (admin tasks)
        const raw = Array.isArray(res.data) ? res.data : (res.data.tasks || [])
        // Keep tasks that are paid/"successful" or active (covers user-created and admin tasks)
        const filtered = raw.filter(t => t && (t.paid === true || t.status === 'active' || t.isActive === true))
        setTasks(filtered)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  // Fetch user's previously completed tasks (server-side records)
  useEffect(() => {
    const fetchCompletions = async () => {
      try {
        const res = await axios.get('/tasks/completions')
        // Expecting { completions: [{ task: {...}, ... }] } or an array
        const raw = Array.isArray(res.data) ? res.data : (res.data.completions || [])
        const objs = raw.map(c => c.task || c)
        const ids = objs.map(o => o && (o._id || o.id)).filter(Boolean)
        setCompletedTaskObjects(objs)
        setCompletedTasks(ids)
      } catch (err) {
        // if endpoint missing or error, silently continue — client will still show recent completions
        // but surface a non-blocking toast for clarity
        if (err.response && err.response.status !== 404) {
          toast.error(err.response?.data?.message || 'Could not load completed tasks')
        }
      }
    }

    fetchCompletions()
  }, [])

// Show confirmation modal before running completion
const handleComplete = (task) => {
  if (processingTask) return
  setPendingConfirm(task)
  setShowConfirm(true)
}

const confirmComplete = async () => {
  const task = pendingConfirm
  if (!task) return
  setShowConfirm(false)
  setProcessingTask(task._id)
  try {
    // Use generic endpoint or platform-specific endpoint
    const endpoint = task.platform ? `/tasks/${task._id}/complete` : `/tasks/twitter/${task._id}/complete`
    
    const res = await axios.post(endpoint, {
      platform: task.platform
    })
    
    if (res.data.success) {
      // Server returns updated balance — use it as source of truth
      if (typeof res.data.balance === 'number') {
        dispatch(updateBalance(res.data.balance))
      }
      toast.success(`+₦${res.data.reward || 0}!`)
      // show success animation
      setLastCompleted({ id: task._id, title: task.title, reward: res.data.reward })
      setCompletedTasks(prev => {
        const next = [...prev, task._id]
        return next
      })
      setCompletedTaskObjects(prev => [...prev, { ...task, reward: res.data.reward }])
      // remove task from tasks list to reflect completed state immediately
      setTasks(prev => prev.filter(t => t._id !== task._id))
    }
  } catch (err) {
    const msg = err.response?.data?.message || 'Cannot complete task'
    if (msg.includes('link your') && msg.includes('account')) {
      toast.error(msg)
      navigate('/profile')
      return
    }
    toast.error(msg)
  } finally {
    setProcessingTask(null)
    setPendingConfirm(null)
  }
}

useEffect(() => {
  if (!lastCompleted) return
  const t = setTimeout(() => setLastCompleted(null), 2200)
  return () => clearTimeout(t)
}, [lastCompleted])

const copyLink = async (task) => {
  try {
    await navigator.clipboard.writeText(task.link || '')
    setCopiedId(task._id)
    toast.success('Link copied')
    setTimeout(() => setCopiedId(null), 1800)
  } catch (e) {
    toast.error('Copy failed')
  }
}



  // legacy client-side completion helper removed — server is source of truth

  const activeTasks = tasks.filter(task => !completedTasks.includes(task._id))
  const completedTasksList = completedTaskObjects

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'} flex items-center justify-center transition-colors`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-t-blue-600 border-blue-200 rounded-full"
        />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'} py-6 px-4 sm:py-8 lg:py-12 transition-colors`}>
      <Container>
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 lg:mb-12">
          <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold ${isDark ? 'text-slate-50' : 'text-blue-800'} mb-3 sm:mb-4 transition-colors`}>
            Complete Tasks & Earn
          </h1>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`inline-block ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'} rounded-2xl sm:rounded-3xl shadow-md border p-4 sm:p-6 md:p-8 max-w-sm mx-auto w-full transition-colors`}
          >
            <p className={`text-base sm:text-lg md:text-xl font-semibold ${isDark ? 'text-slate-300' : 'text-blue-800'} mb-2 transition-colors`}>Balance</p>
            <p className={`text-3xl sm:text-4xl md:text-5xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </motion.div>
        </div>

        {/* Active Tasks */}
        <div className="mb-12 sm:mb-16">
          <div className="mb-4 sm:mb-6 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks" className={`flex-1 p-2 sm:p-3 rounded-lg border text-sm sm:text-base ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'border-gray-200 bg-white text-gray-900'} transition-colors`} />
              <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className={`p-2 sm:p-3 rounded-lg border text-sm sm:text-base ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'border-gray-200 bg-white text-gray-900'} transition-colors`}>
                <option value="all">All Platforms</option>
                <option value="X">X (Twitter)</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="Facebook">Facebook</option>
                <option value="YouTube">YouTube</option>
              </select>
            </div>
            <div className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Available tasks are updated frequently</div>
          </div>

          {/* Confirmation modal */}
          {showConfirm && pendingConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/40'} transition-colors`} onClick={() => setShowConfirm(false)} />
              <div className={`relative ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 shadow-lg max-w-md w-full transition-colors`}>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-50' : 'text-gray-900'} mb-2`}>Confirm completion</h3>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'} mb-4`}>Are you sure you completed: <strong>{pendingConfirm.title}</strong> ?</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setShowConfirm(false); setPendingConfirm(null) }} className={`px-4 py-2 rounded-md border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-900 hover:bg-gray-50'} transition-colors`}>Cancel</button>
                  <button onClick={confirmComplete} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">Yes, verify</button>
                </div>
              </div>
            </div>
          )}

          <h2 className={`text-2xl sm:text-3xl font-semibold ${isDark ? 'text-slate-50' : 'text-blue-800'} mb-6 text-center sm:text-left transition-colors`}>
            Active Tasks ({activeTasks.length})
          </h2>

          {activeTasks.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? 'bg-slate-800' : 'bg-white'} rounded-3xl shadow-md ${isDark ? 'border-slate-700' : 'border-blue-100'} border transition-colors`}>
              <p className={`text-xl ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>No active tasks right now</p>
              <p className={`${isDark ? 'text-slate-400' : 'text-gray-500'} mt-2`}>Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {activeTasks
                .filter(t => (platformFilter === 'all' || t.platform === platformFilter) && (t.title.toLowerCase().includes(search.toLowerCase()) || t.platform.toLowerCase().includes(search.toLowerCase())))
                .map((task, i) => (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'} rounded-3xl shadow-md border p-6 transition-all hover:shadow-lg flex flex-col h-full`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold">
                      {task.platform}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-blue-600">+₦{task.reward}</span>
                  </div>

                  <h3 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'} mb-3`}>{task.title}</h3>

                  <div className="flex flex-col items-stretch gap-2 mb-3">
                    <a
                      href={task.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl hover:bg-blue-700 transition text-xs sm:text-sm shadow-sm"
                      aria-label={`Open task ${task.title}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 3h6v6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 14L21 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span className="hidden sm:inline">Open Task</span>
                      <span className="sm:hidden">Open</span>
                    </a>

                    <button onClick={() => copyLink(task)} aria-label="Copy task link" className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-xs sm:text-sm text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {copiedId === task._id ? <span className="text-green-600 text-xs sm:text-sm">Copied</span> : <span className="sr-only">Copy link</span>}
                    </button>
                  </div>

                  <div className="mt-auto">
                    <button
                      onClick={() => handleComplete(task)}
                      disabled={processingTask === task._id}
                      className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all text-sm sm:text-base"
                    >
                      {processingTask === task._id ? (
                        <>
                          <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          <span className="hidden sm:inline">Verifying…</span>
                          <span className="sm:hidden">Verify…</span>
                        </>
                      ) : (
                        <span>Verify & Complete</span>
                      )}
                    </button>
                  </div>

                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Tasks */}
        {completedTasksList.length > 0 && (
          <div>
            <h2 className={`text-xl sm:text-2xl md:text-3xl font-semibold ${isDark ? 'text-emerald-400' : 'text-green-800'} mb-4 sm:mb-6 text-center sm:text-left transition-colors`}>
              Completed Tasks ({completedTasksList.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {completedTasksList.map((task, i) => (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`${isDark ? 'bg-emerald-900/30 border-emerald-800' : 'bg-green-50 border-green-100'} rounded-3xl shadow-md border p-6 opacity-80 transition-colors`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-green-100 text-green-600 px-4 py-2 rounded-full text-sm font-semibold">
                      {task.platform}
                    </span>
                    <span className="text-2xl font-bold text-green-600">+₦{task.reward}</span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{task.title}</h3>

                  <button className="w-full bg-gray-300 text-gray-600 py-3 rounded-2xl font-semibold cursor-not-allowed">
                    Completed ✓
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </Container>

      {/* Floating Balance */}
      {/* Success animation */}
      {lastCompleted && (
        <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="fixed top-6 right-6 z-50 bg-white p-4 rounded-xl shadow-lg flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xl font-bold">✓</div>
          <div>
            <div className="text-sm font-semibold">Task Completed</div>
            <div className="text-sm text-gray-600">+₦{lastCompleted.reward}</div>
          </div>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        className="fixed bottom-20 right-4 z-50 lg:hidden bg-blue-600 text-white p-4 rounded-full shadow-2xl border-4 border-white"
      >
        <p className="text-center text-xs">
          <span className="block font-bold">Balance</span>
          <span className="text-xl font-bold">₦{balance.toLocaleString()}</span>
        </p>
      </motion.div>
    </div>
  )
}