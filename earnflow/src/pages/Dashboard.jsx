import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import Container from '../components/Container'

export default function Dashboard() {
  const { user, balance } = useSelector(state => state.auth)

  const features = [
    { icon: '📋', title: 'Tasks', to: '/tasks' },
    { icon: '💰', title: 'Withdraw', to: '/withdraw' },
    { icon: '👤', title: 'Profile', to: '/profile' },
    { icon: '🎁', title: 'Rewards', to: '/rewards' },
    { icon: '📊', title: 'History', to: '/history' },
    { icon: '➕', title: 'Referral', to: '/referral' },
    { icon: '➕', title: 'Referral', to: '/referral' },
    { icon: '➕', title: 'Create Task', to: '/create-task' },
    { icon: '➕', title: 'My Tasks', to: '/my-tasks' }
  ]

  // Show admin panel to users with role 'admin'
  if (user?.role === 'admin') {
    features.push({ icon: '🛠️', title: 'Admin Tasks', to: '/admin' })
    features.push({ icon: '🛠️', title: 'Admin Campaing', to: '/admin/campaigns' })
    features.push({ icon: '🛠️', title: 'Admin Users', to: '/admin/users' })
  }

  const stat = (label, value, tone = 'text-gray-700') => (
    <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl text-center">
      <div className={`text-xs font-medium text-gray-500`}>{label}</div>
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
    </div>
  )

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
            <Link key={i} to={f.to} className="bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow hover:shadow-md transition">
              <div className="text-2xl">{f.icon}</div>
              <div className="text-sm font-medium">{f.title}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Promo + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <h4 className="text-xl font-bold">World Earn Carnival</h4>
            <p className="mt-2 text-sm opacity-90">Join now for a chance to win big — ₦400,000,000 in cash prizes.</p>
          </div>
          <div className="mt-4">
            <button className="bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold">Join Now</button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow">
          <h4 className="font-semibold mb-3">Recent Activity</h4>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <div>Task: Follow @earnflow</div>
              <div className="text-green-600 font-bold">+₦100</div>
            </div>
            <div className="flex items-center justify-between">
              <div>Withdrawal to Bank</div>
              <div className="text-red-600 font-bold">-₦500</div>
            </div>
          </div>
          <Link to="/history" className="block text-center mt-4 text-indigo-600 font-medium">View Full History</Link>
        </div>
      </div>

    </Container>
  )
}
