import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from '../utils/axios'
import { useTheme } from '../context/ThemeContext'
import Container from '../components/Container'

export default function Dashboard() {
  const { user, balance } = useSelector(state => state.auth)
  const { isDark } = useTheme()

  const features = [
    { icon: '📋', title: 'Tasks', to: '/tasks' },
    { icon: '💰', title: 'Withdraw', to: '/withdraw' },
    { icon: '👤', title: 'Profile', to: '/profile' },
    { icon: '🎁', title: 'Rewards', to: '/rewards' },
    { icon: '📊', title: 'History', to: '/history' },
    { icon: '➕', title: 'Referral', to: '/referral' },
    // { icon: '➕', title: 'Referral', to: '/referral' },
    // { icon: '➕', title: 'Create Task', to: '/create-task' },
    // { icon: '➕', title: 'My Tasks', to: '/my-tasks' }
  ]

  // Show admin panel to users with role 'admin'
  if (user?.role === 'admin') {
    features.push({ icon: '🛠️', title: 'Admin Tasks', to: '/admin' })
    features.push({ icon: '🛠️', title: 'Admin Campaing', to: '/admin/campaigns' })
    features.push({ icon: '🛠️', title: 'Admin Users', to: '/admin/users' })
    features.push({ icon: '🛠️', title: 'Create Task', to: '/create-task' })
    features.push({ icon: '🛠️', title: 'My Tasks', to: '/my-tasks' })
    features.push({ icon: '🛠️', title: 'Exchange Rate', to: '/admin/exchange-rate' })
    features.push({ icon: '🛠️', title: 'Exchange Rate Audit', to: '/admin/exchange-rate/audit' })
  }

  const stat = (label, value, tone = 'text-gray-700') => (
    <div className={`${isDark ? 'bg-slate-800/60 border border-slate-700' : 'bg-white/60'} backdrop-blur-sm p-4 rounded-xl text-center transition-colors`}>
      <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</div>
      <div className={`text-lg font-bold ${isDark && tone.includes('gray') ? 'text-slate-200' : tone}`}>{value}</div>
    </div>
  )

  const [recentActivity, setRecentActivity] = useState([])
  const [notifications, setNotifications] = useState([])

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

  const markNotificationRead = async (id) => {
    try {
      await axios.patch(`/notifications/read/${id}`)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
    } catch (e) { console.warn('mark read failed', e) }
  }

  return (
    <Container className="p-4 space-y-6">

      {/* Top Row: Welcome + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-500 text-white p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-sm opacity-90">Welcome back</div>
              <div className="text-2xl sm:text-3xl font-extrabold mt-1">{user?.name || 'User'}</div>
              <div className="mt-2 text-sm opacity-90">Available Balance</div>
              <div className="text-3xl sm:text-4xl font-extrabold mt-2">₦{Number(balance || 0).toLocaleString()}</div>
            </div>

            <div className="flex gap-3">
              <Link to="/tasks" className="bg-white/95 text-indigo-600 px-4 py-2 rounded-lg font-semibold shadow-sm hover:opacity-95">Go To Tasks</Link>
              <Link to="/withdraw" className="bg-white/95 text-indigo-600 px-4 py-2 rounded-lg font-semibold shadow-sm hover:opacity-95">Withdraw</Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stat('Tasks', user?.tasksCompleted || 0, 'text-indigo-700')}
          {stat('Referrals', user?.referrals || 0, 'text-green-700')}
          {stat('Status', user?.accountStatus || 'Active', 'text-gray-700')}
        </div>
      </div>

      {/* Features grid */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {features.map((f, i) => (
            <Link key={i} to={f.to} className={`${isDark ? 'bg-slate-800 border border-slate-700 hover:bg-slate-700' : 'bg-white hover:shadow-md'} rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow transition-colors`}>
              <div className="text-2xl">{f.icon}</div>
              <div className="text-sm font-medium">{f.title}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Promo + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
          {/* <div>
            <h4 className="text-xl font-bold">World Earn Carnival</h4>
            <p className="mt-2 text-sm opacity-90">Join now for a chance to win big — ₦400,000,000 in cash prizes.</p>
          </div> */}
          <div className="mt-4">
            <button className="bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold">Join Now</button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow space-y-4">
          <div>
            <h4 className="font-semibold mb-3">Notifications</h4>
            {notifications && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div key={n._id} className={`p-2 rounded border ${isDark ? (n.read ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-600') : (n.read ? 'bg-gray-50' : 'bg-white')} transition-colors`}>
                    <div className="flex items-center justify-between">
                      <div className={`text-sm font-medium ${isDark ? 'text-slate-200' : ''}`}>{n.title}</div>
                      {!n.read && <button onClick={() => markNotificationRead(n._id)} className="text-xs text-blue-600">Mark read</button>}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{n.message}</div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'} mt-1`}>{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>No notifications</div>
            )}
          </div>

          <h4 className="font-semibold">Recent Activity</h4>
          <div className={`space-y-3 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            {/** Render fetched activity items or a friendly message */}
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((it) => (
                <div key={it.key} className="flex items-center justify-between">
                  <div className="truncate">{it.text}</div>
                  <div className={`${it.type === 'credit' ? 'text-green-600' : it.type === 'debit' ? 'text-red-600' : isDark ? 'text-slate-400' : 'text-gray-600'} font-bold`}>{it.displayAmount}</div>
                </div>
              ))
            ) : (
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>No recent activity yet</div>
            )}
          </div>
          <Link to="/history" className="block text-center mt-4 text-indigo-600 font-medium">View Full History</Link>
        </div>
      </div>

    </Container>
  )
}
