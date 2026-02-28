import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from '../utils/axios'
import { useTheme } from '../context/ThemeContext'
import Container from '../components/Container'
import Card from '../components/Card'
import { FaMoneyBillAlt, FaTasks,FaUser,FaSignal, FaHistory, FaChevronDown, FaChevronUp } from 'react-icons/fa'

export default function Dashboard() {
  const { user, balance } = useSelector(state => state.auth)
  const { isDark } = useTheme()

  const features = [
    { icon: <FaTasks className="text-cyan-500" />, title: 'Tasks', to: '/tasks' },
    { icon: <FaMoneyBillAlt className="text-cyan-500" />, title: 'Withdraw', to: '/withdraw' },
    { icon: <FaUser className="text-cyan-500" />, title: 'Profile', to: '/profile' },
    // { icon: '🎁', title: 'Rewards', to: '/rewards' },
    { icon: <FaHistory className="text-cyan-500" />, title: 'History', to: '/history' },
    { icon: '➕', title: 'Referral', to: '/referral' },
    { icon: '➕', title: 'Create Task', to: '/create-task' },
    { icon: <FaTasks className="text-cyan-500" />, title: 'My Tasks', to: '/my-tasks' },
    { icon: '💬', title: 'Support', to: '/support' },
    { icon: <FaSignal className="text-cyan-500" />, title: 'Buy Data & Airtime', to: '/buy-data-airtime' },
    {icon: <FaMoneyBillAlt className="text-cyan-500" />, title: 'Wallet', to: '/wallet' }
    
  ]

  // Show admin panel to users with role 'admin'
  if (user?.role === 'admin') {
    features.push({ icon: '🛠️', title: 'Admin Tasks', to: '/admin' })
    features.push({ icon: '🛠️', title: 'Admin Campaing', to: '/admin/campaigns' })
    features.push({ icon: '🛠️', title: 'Admin Users', to: '/admin/users' })
    features.push({ icon: '🛠️', title: 'Create Task', to: '/create-task' })
    features.push({ icon: <FaTasks className="text-cyan-500" />, title: 'My Tasks', to: '/my-tasks' })
    features.push({ icon: '🛠️', title: 'Exchange Rate', to: '/admin/exchange-rate' })
    features.push({ icon: '🛠️', title: 'Exchange Rate Audit', to: '/admin/exchange-rate/audit' })
    features.push({ icon: '🛠️', title: 'Pending Payments', to: '/admin/pending-payments' })
    features.push({ icon: '🛠️', title: 'Data & Airtime Packages', to: '/admin/data-airtime-packages' })
  }

  const stat = (label, value, tone = 'text-gray-700') => (
    <div className={`${isDark ? 'bg-slate-800/60 border border-slate-700' : 'bg-white/60'} backdrop-blur-sm p-4 rounded-xl text-center transition-colors`}>
      <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</div>
      <div className={`text-lg font-bold ${isDark && tone.includes('gray') ? 'text-slate-200' : tone}`}>{value}</div>
    </div>
  )

  const [recentActivity, setRecentActivity] = useState([])
  const [notifications, setNotifications] = useState([])
  const [deviceStatus, setDeviceStatus] = useState(null)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!user || !user._id) return
      try {
        const [txRes, refRes] = await Promise.allSettled([
          axios.get('/transactions'),
          axios.get('/referral/me')
        ])

        // load notifications
        try {
          const nres = await axios.get('/notifications')
          if (nres.data && nres.data.notifications) setNotifications(nres.data.notifications.slice(0, 8))
        } catch (e) {
          console.warn('Could not load notifications', e)
        }

        const txs = (txRes.status === 'fulfilled' && txRes.value?.data?.transactions) || []
        const refs = (refRes.status === 'fulfilled' && refRes.value?.data?.referral?.recentReferrals) || []

        const txItems = txs.slice(0, 10).map(t => ({
          key: `tx-${t.id}`,
          text: t.description || 'Transaction',
          date: new Date(t.date).getTime ? new Date(t.date).getTime() : Date.now(),
          type: t.type || (t.amount >= 0 ? 'credit' : 'debit'),
          amount: t.amount || 0,
          displayAmount: `${t.amount >= 0 ? '+' : '-'}₦${Math.abs(t.amount || 0).toLocaleString()}`
        }))

        const refItems = refs.slice(0, 10).map((r, i) => ({
          key: `ref-${i}-${r.name || ''}`,
          text: `${r.name || 'New signup'} — referral ${r.status || ''}`.trim(),
          date: r.date ? (isNaN(Date.parse(r.date)) ? Date.now() : Date.parse(r.date)) : Date.now(),
          type: r.status === 'completed' ? 'credit' : 'neutral',
          amount: r.reward || 0,
          displayAmount: r.status === 'completed' ? `+₦${(r.reward || 0).toLocaleString()}` : 'Pending'
        }))

        const combined = [...txItems, ...refItems]
          .sort((a, b) => (b.date || 0) - (a.date || 0))
          .slice(0, 6)

        if (mounted) setRecentActivity(combined)
      } catch (err) {
        console.warn('Could not load recent activity', err)
        if (mounted) setRecentActivity([])
      }
    }
    load()
    return () => { mounted = false }
  }, [user])

  useEffect(() => {
    const loadDeviceStatus = async () => {
      try {
        const res = await axios.get('/devices/status')
        if (res.data) setDeviceStatus(res.data)
      } catch (e) {
        // ignore
      }
    }
    loadDeviceStatus()
  }, [user])

  const markNotificationRead = async (id) => {
    try {
      await axios.patch(`/notifications/read/${id}`)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
    } catch (e) { console.warn('mark read failed', e) }
  }

  // track which notifications are expanded
  const [expandedNotifications, setExpandedNotifications] = useState({})
  const toggleNotification = id => {
    setExpandedNotifications(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const revokeOtherDevices = async () => {
    try {
      const pwd = window.prompt('Enter your password to confirm revoking other device sessions')
      if (!pwd) return
      const res = await axios.post('/auth/logout-others', { password: pwd })
      if (res.data && res.data.success) {
        alert('Other device sessions revoked')
        setDeviceStatus(prev => ({ ...prev, othersRevoked: true }))
      } else {
        alert(res.data?.message || 'Failed to revoke sessions')
      }
    } catch (e) {
      console.warn('revoke failed', e)
      alert(e.response?.data?.message || 'Failed to revoke sessions')
    }
  }

  return (
    <Container className="p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* page title */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold">Dashboard</h2>
        {unreadCount > 0 && (
          <div className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">{unreadCount} new</div>
        )}
      </div>

      {/* Top Row: Welcome + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-500 text-white p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm opacity-90">Welcome back</div>
              <div className="text-xl sm:text-3xl font-extrabold mt-1 truncate">{user?.name || 'User'}</div>
              <div className="mt-2 text-xs sm:text-sm opacity-90">Available Balance</div>
              <div className="text-2xl sm:text-4xl font-extrabold mt-2">₦{Number(balance || 0).toLocaleString()}</div>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Link to="/tasks" className="bg-white/95 text-indigo-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold shadow-sm hover:opacity-95 text-center text-sm sm:text-base">Go To Tasks</Link>
              <Link to="/withdraw" className="bg-white/95 text-indigo-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold shadow-sm hover:opacity-95 text-center text-sm sm:text-base">Withdraw</Link>
              <button onClick={revokeOtherDevices} className="bg-white/95 text-indigo-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold shadow-sm hover:opacity-95 text-center text-sm sm:text-base">Logout Other Devices</button>
            </div>
          </div>
          {deviceStatus && (
            <div className={`mt-3 p-2 rounded-lg text-sm ${deviceStatus.devices.length > 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              {deviceStatus.devices.length > 1
                ? `You have ${deviceStatus.devices.length - 1} other active session${deviceStatus.devices.length - 1 > 1 ? 's' : ''}.`
                : 'Only this device is active.'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {stat('Tasks', user?.tasksCompleted || 0, 'text-indigo-700')}
          {stat('Referrals', user?.referrals || 0, 'text-green-700')}
          {stat('Status', user?.accountStatus || 'Active', 'text-gray-700')}
        </div>
      </div>

      {/* Features grid */}
      <Card className="p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {features.map((f, i) => (
            <Link key={i} to={f.to} className={`${isDark ? 'bg-slate-800 border border-slate-700 hover:bg-slate-700' : 'bg-white'} rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow hover:shadow-lg transform hover:scale-105 transition-all duration-150`}>
              <div className="text-2xl">{f.icon}</div>
              <div className="text-xs sm:text-sm font-semibold text-center">{f.title}</div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Promo + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 sm:p-6 rounded-2xl shadow-lg flex flex-col justify-between">
          {/* <div>
            <h4 className="text-xl font-bold">World Earn Carnival</h4>
            <p className="mt-2 text-sm opacity-90">Join now for a chance to win big — ₦400,000,000 in cash prizes.</p>
          </div> */}
          {/* <div className="mt-4">
            <button className="bg-white text-blue-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base">Join Now</button>
          </div> */}
        </div>

        <Card className="space-y-3 sm:space-y-4">
          <div>
            <h4 className={`font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base transition-colors ${isDark ? 'text-slate-50' : ''}`}>Notifications {unreadCount > 0 && <span className="text-xs bg-red-400 text-white px-1 rounded-full">{unreadCount}</span>}</h4>
            {notifications && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map(n => {
                  const isExpanded = !!expandedNotifications[n._id]
                  const displayMsg = isExpanded
                    ? n.message
                    : n.message.length > 80
                      ? n.message.slice(0, 80) + '...'
                      : n.message
                  return (
                    <div key={n._id} className={`p-2 rounded border text-xs sm:text-sm transition-colors ${isDark ? (n.read ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-600') : (n.read ? 'bg-gray-50' : 'bg-white')}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className={`font-medium transition-colors ${isDark ? 'text-slate-200' : ''}`}>{n.title}</div>
                        <div className="flex items-center gap-2">
                          {!n.read && <button onClick={() => markNotificationRead(n._id)} className="text-xs text-blue-600 whitespace-nowrap">Mark read</button>}
                          <button onClick={() => toggleNotification(n._id)} className="text-xs text-indigo-500 flex items-center gap-1">
                            {isExpanded ? <><FaChevronUp className="inline"/> Collapse</> : <><FaChevronDown className="inline"/> Expand</>}
                          </button>
                        </div>
                      </div>
                      <div className={`text-xs transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'} mt-1 ${isExpanded ? 'transition-all duration-150' : ''}`}>{displayMsg}</div>
                      <div className={`text-xs transition-colors ${isDark ? 'text-slate-500' : 'text-gray-400'} mt-1`}>{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={`text-xs transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>No notifications</div>
            )}
          </div>

          <h4 className={`font-semibold text-sm sm:text-base transition-colors ${isDark ? 'text-slate-50' : ''}`}>Recent Activity</h4>
          <div className={`space-y-2 sm:space-y-3 text-xs sm:text-sm transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>        
            {/** Render fetched activity items or a friendly message */}
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((it) => (
                <div key={it.key} className={`${isDark ? 'bg-slate-800' : 'bg-gray-50'} p-2 rounded-lg hover:bg-opacity-90 transition-colors`}>                  
                  <div className="flex items-center justify-between gap-2">
                    <span className={`${it.type === 'credit' ? 'text-green-600' : it.type === 'debit' ? 'text-red-600' : isDark ? 'text-slate-400' : 'text-gray-600'} font-bold`}>{it.type === 'credit' ? '+' : it.type === 'debit' ? '-' : '·'}</span>
                    <div className="truncate flex-1 text-xs sm:text-sm">{it.text}</div>
                    <div className={`${it.type === 'credit' ? 'text-green-600' : it.type === 'debit' ? 'text-red-600' : isDark ? 'text-slate-400' : 'text-gray-600'} font-bold whitespace-nowrap`}>{it.displayAmount}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className={`text-xs transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>No recent activity yet</div>
            )}
          </div>
          <Link to="/history" className="block text-center mt-4 text-indigo-600 font-medium text-sm sm:text-base transition-colors hover:text-indigo-700">View Full History</Link>
    </Card>
        </div>
  </Container>
  )
}
