import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { logout } from '../features/auth/authSlice'
import axios from '../utils/axios'
import toast from 'react-hot-toast'

// 5 minutes inactivity, warn 30 seconds before
const INACTIVITY_LIMIT = 5 * 60 * 1000
const WARNING_DURATION = 30 * 1000

export default function IdleTimer() {
  const dispatch = useDispatch()
  const [warnVisible, setWarnVisible] = useState(false)
  const [countdown, setCountdown] = useState(WARNING_DURATION / 1000)

  const warningTimer = useRef(null)
  const logoutTimer = useRef(null)
  const countdownInterval = useRef(null)

  const logoutUser = async () => {
    // clear timers first to avoid double-calls
    if (warningTimer.current) clearTimeout(warningTimer.current)
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (countdownInterval.current) clearInterval(countdownInterval.current)

    try {
      await axios.post('/auth/logout')
    } catch (e) {
      // ignore; we'll clear state anyway
    }
    dispatch(logout())
    toast('Logged out due to inactivity', { icon: '⚠️' })
    window.location.href = '/login'
  }

  const resetTimers = () => {
    if (warningTimer.current) clearTimeout(warningTimer.current)
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (countdownInterval.current) clearInterval(countdownInterval.current)

    setWarnVisible(false)
    setCountdown(WARNING_DURATION / 1000)

    warningTimer.current = setTimeout(() => {
      setWarnVisible(true)
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current)
          }
          return prev - 1
        })
      }, 1000)
    }, INACTIVITY_LIMIT - WARNING_DURATION)

    logoutTimer.current = setTimeout(logoutUser, INACTIVITY_LIMIT)
  }

  const activityHandler = () => {
    if (warnVisible) {
      setWarnVisible(false)
    }
    resetTimers()
  }

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(evt => window.addEventListener(evt, activityHandler))
    resetTimers()

    return () => {
      events.forEach(evt => window.removeEventListener(evt, activityHandler))
      if (warningTimer.current) clearTimeout(warningTimer.current)
      if (logoutTimer.current) clearTimeout(logoutTimer.current)
      if (countdownInterval.current) clearInterval(countdownInterval.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!warnVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-lg font-semibold mb-2">Inactivity Warning</h2>
        <p className="mb-4">
          You will be logged out due to inactivity{countdown ? ` in ${countdown}s.` : '.'}
        </p>
        <div className="text-right">
          <button
            onClick={activityHandler}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Stay logged in
          </button>
        </div>
      </div>
    </div>
  )
}
