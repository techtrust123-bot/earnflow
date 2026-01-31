import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import Container from '../components/Container'
import axios from '../utils/axios'
import { useTheme } from '../context/ThemeContext'

export default function AdminUsers() {
	const { token, user: currentUser } = useSelector((s) => s.auth)
	const { isDark } = useTheme()
	const [users, setUsers] = useState([])
	const [stats, setStats] = useState({ totalUsers: 0, activeToday: 0, totalEarnings: 0, totalWithdrawn: 0 })
	const [q, setQ] = useState('')
	const [loading, setLoading] = useState(true)
	const [deletingId, setDeletingId] = useState(null)
	const [editingRole, setEditingRole] = useState(null)
	const [updatingRoleId, setUpdatingRoleId] = useState(null)

	useEffect(() => {
		fetchUsersAndStats()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token])

	const fetchUsersAndStats = async () => {
		setLoading(true)
		try {
			const [usersRes, statsRes] = await Promise.all([
				axios.get('/admin/users'),
				axios.get('/admin/stats')
			])

			setUsers(usersRes.data.users || [])
			setStats(statsRes.data || {})
		} catch (err) {
			console.error(err)
			toast.error('Failed to load admin data')
		} finally {
			setLoading(false)
		}
	}

	const handleDeleteUser = async (id) => {
		if (!window.confirm('Delete this user? This action is irreversible.')) return
		setDeletingId(id)
		try {
			await axios.delete(`/admin/users/${id}`)
			// Optimistically remove user from UI without full refetch
			setUsers((prev) => prev.filter((u) => u._id !== id))
			setStats((s) => ({ ...s, totalUsers: Math.max(0, (s.totalUsers || 1) - 1) }))
			toast.success('User deleted')
		} catch (err) {
			console.error(err)
			toast.error(err.response?.data?.message || 'Failed to delete user')
		} finally {
			setDeletingId(null)
		}
	}

	const handleUpdateRole = async (userId, newRole) => {
		if (!window.confirm(`Change this user's role to ${newRole}?`)) return
		setUpdatingRoleId(userId)
		try {
			const res = await axios.patch(`/admin/users/${userId}/role`, { role: newRole })
			if (res.data.success) {
				// Update user in UI
				setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)))
				toast.success(`Role updated to ${newRole}`)
				setEditingRole(null)
			}
		} catch (err) {
			console.error(err)
			toast.error(err.response?.data?.message || 'Failed to update role')
		} finally {
			setUpdatingRoleId(null)
		}
	}

	const filtered = useMemo(() => {
		const qLower = q.trim().toLowerCase()
		if (!qLower) return users
		return users.filter((u) => (u.name || '').toLowerCase().includes(qLower) || (u.email || '').toLowerCase().includes(qLower))
	}, [q, users])

	return (
		<Container>
			<div className={`space-y-4 sm:space-y-6 min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gray-50'} transition-colors p-4 sm:p-6`}>
				<header className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
					<div>
						<h1 className={`text-xl sm:text-2xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Admin • Users</h1>
						<p className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Overview of platform users and activity</p>
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
						<input
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Search name or email"
							className={`flex-1 sm:w-64 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'}`}
						/>
						<button
							onClick={fetchUsersAndStats}
							className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
						>
							Refresh
						</button>
					</div>
				</header>

				<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard title="Total Users" value={stats.totalUsers} isDark={isDark} />
					<StatCard title="Active Today" value={stats.activeToday} isDark={isDark} />
					<StatCard title="Total Earnings" value={`₦${Number(stats.totalEarnings || 0).toLocaleString()}`} isDark={isDark} />
					<StatCard title="Total Withdrawn" value={`₦${Number(stats.totalWithdrawn || 0).toLocaleString()}`} isDark={isDark} />
				</section>

				<section>
					<div className={`rounded-2xl overflow-hidden shadow transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
						<div className={`p-4 border-b transition-colors ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
							<h2 className={`font-semibold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Users ({filtered.length})</h2>
						</div>

						<div className="p-4">
							{loading ? (
								<div className={`text-center py-12 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Loading users...</div>
							) : filtered.length === 0 ? (
								<div className={`text-center py-12 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>No users found</div>
							) : (
								<div className="space-y-3">
									{/* responsive list: cards on small screens, table on larger */}
									<div className="hidden lg:block">
										<div className="overflow-x-auto">
										  <table className="w-full text-left">
											<thead className={`text-sm border-b transition-colors ${isDark ? 'text-slate-400 border-slate-700' : 'text-gray-600 border-gray-200'}`}>
												<tr>
													<th className="py-3">Name</th>
													<th>Email</th>
													<th>Balance</th>
													<th>Tasks</th>
													<th>Role</th>
													<th>Joined</th>
													<th>Verified</th>
													<th>Status</th>
													<th>Actions</th>
												</tr>
											</thead>
											<tbody>
												{filtered.map((u) => (
													<tr key={u._id} className={`border-b transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
														<td className={`py-3 transition-colors ${isDark ? 'text-slate-50' : ''}`}>{u.name || '—'}</td>
														<td className={isDark ? 'text-slate-300' : ''}>{u.email || '—'}</td>
														<td className={`font-semibold transition-colors ${isDark ? 'text-emerald-400' : 'text-green-600'}`}>₦{Number(u.balance || 0).toLocaleString()}</td>
														<td className={isDark ? 'text-slate-300' : ''}>{u.tasksCompleted || 0}</td>
														<td>
															<span className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${u.role === 'admin' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800') : (isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800')}`}>
																{u.role || 'user'}
															</span>
														</td>
														<td className={`text-sm transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{new Date(u.createdAt).toLocaleDateString()}</td>
														<td>
															<span className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${u.isAccountVerify ? (isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') : (isDark ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800')}`}>
																{u.isAccountVerify ? 'Verified' : 'Unverified'}
															</span>
														</td>
														<td>
															<UserStatus lastActive={u.lastActive} isDark={isDark} />
														</td>
														<td className="space-y-1">
															<button
																onClick={() => setEditingRole(u._id)}
																className="block w-full px-3 py-2 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
															>
																Change Role
															</button>
															<button
																onClick={() => handleDeleteUser(u._id)}
																disabled={deletingId === u._id}
																className="block w-full px-3 py-2 rounded-md bg-red-500 text-white text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
															>
																{deletingId === u._id ? 'Deleting…' : 'Delete'}
															</button>
														</td>
													</tr>
												))}
											</tbody>
										  </table>
										</div>
									</div>

									<div className="lg:hidden grid gap-3">
										{filtered.map((u) => (
											<div key={u._id} className={`p-4 border rounded-lg transition-colors ${isDark ? 'bg-slate-700 border-slate-600' : 'border-gray-200'}`}>
												<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
													<div className="flex-1 min-w-0">
														<div className={`font-semibold transition-colors ${isDark ? 'text-slate-50' : ''} truncate`}>{u.name || '—'}</div>
														<div className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'} truncate`}>{u.email || '—'}</div>
														<div className={`text-xs transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Joined: {new Date(u.createdAt).toLocaleDateString()}</div>
													</div>
													<div className="flex flex-col items-end gap-1">
														<div className={`font-semibold transition-colors ${isDark ? 'text-emerald-400' : 'text-green-600'}`}>₦{Number(u.balance || 0).toLocaleString()}</div>
														<div className={`text-xs transition-colors ${isDark ? 'text-slate-300' : ''}`}>Tasks: {u.tasksCompleted || 0}</div>
													</div>
												</div>
												<div className="flex flex-wrap items-center justify-between gap-2 mt-3">
													<div className="flex items-center gap-2">
														<span className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${u.role === 'admin' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800') : (isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800')}`}>
															{u.role || 'user'}
														</span>
														<span className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${u.isAccountVerify ? (isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') : (isDark ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800')}`}>
															{u.isAccountVerify ? 'Verified' : 'Unverified'}
														</span>
													</div>
													<UserStatus lastActive={u.lastActive} isDark={isDark} />
												</div>
												<div className="grid grid-cols-2 gap-2 mt-3">
													<button
														onClick={() => setEditingRole(u._id)}
														className="px-3 py-2 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors"
													>
														Change Role
													</button>
													<button
														onClick={() => handleDeleteUser(u._id)}
														disabled={deletingId === u._id}
														className="px-3 py-2 rounded-md bg-red-500 text-white text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
													>
														{deletingId === u._id ? 'Deleting…' : 'Delete'}
													</button>
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				</section>
			</div>

			{/* Role Edit Modal */}
			{editingRole && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className={`rounded-lg p-4 sm:p-6 max-w-md w-full transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
						<h3 className={`text-lg font-bold mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Change User Role</h3>
						<div className="space-y-4">
							<div>
								<label className={`block text-sm font-medium mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Select New Role</label>
								<select
									defaultValue={users.find((u) => u._id === editingRole)?.role || 'user'}
									onChange={(e) => {
										const newRole = e.target.value
										handleUpdateRole(editingRole, newRole)
									}}
									disabled={updatingRoleId === editingRole}
									className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'border-gray-300 bg-white text-gray-900'}`}
								>
									<option value="user">User</option>
									<option value="admin">Admin</option>
								</select>
							</div>
							<div className="flex flex-col sm:flex-row justify-end gap-2">
								<button
									onClick={() => setEditingRole(null)}
									disabled={updatingRoleId === editingRole}
									className={`px-4 py-2 border rounded-lg transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 hover:bg-gray-50'} disabled:opacity-50`}
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</Container>
	)
}

function StatCard({ title, value, isDark }) {
	return (
		<div className={`p-4 sm:p-5 rounded-lg border transition-colors ${isDark ? 'bg-gradient-to-r from-slate-700 to-slate-800 border-slate-600' : 'bg-gradient-to-r from-indigo-50 to-white border-gray-200'}`}>
			<div className={`text-xs sm:text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{title}</div>
			<div className={`mt-2 text-xl sm:text-2xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>{value}</div>
		</div>
	)
}

function UserStatus({ lastActive, isDark }) {
	const last = lastActive ? new Date(lastActive) : null
	const now = Date.now()
	const isActive = last && last.getTime() > now - 24 * 60 * 60 * 1000

	const timeAgo = (d) => {
		if (!d) return ''
		const s = Math.floor((Date.now() - d.getTime()) / 1000)
		if (s < 60) return `${s}s ago`
		const m = Math.floor(s / 60)
		if (m < 60) return `${m}m ago`
		const h = Math.floor(m / 60)
		if (h < 24) return `${h}h ago`
		const days = Math.floor(h / 24)
		return `${days}d ago`
	}

	return (
		<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
			<span className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${isActive ? (isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>
				{isActive ? 'Active' : 'Inactive'}
			</span>
			<span className={`text-xs transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{last ? timeAgo(last) : 'no activity'}</span>
		</div>
	)
}
