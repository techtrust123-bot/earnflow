import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import Container from '../components/Container'
import axios from '../utils/axios'

export default function AdminUsers() {
	const { token, user: currentUser } = useSelector((s) => s.auth)
	const [users, setUsers] = useState([])
	const [stats, setStats] = useState({ totalUsers: 0, activeToday: 0, totalEarnings: 0, totalWithdrawn: 0 })
	const [q, setQ] = useState('')
	const [loading, setLoading] = useState(true)
	const [deletingId, setDeletingId] = useState(null)

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

	const filtered = useMemo(() => {
		const qLower = q.trim().toLowerCase()
		if (!qLower) return users
		return users.filter((u) => (u.name || '').toLowerCase().includes(qLower) || (u.email || '').toLowerCase().includes(qLower))
	}, [q, users])

	return (
		<Container>
			<div className="space-y-6">
				<header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold">Admin • Users</h1>
						<p className="text-sm text-gray-500">Overview of platform users and activity</p>
					</div>

					<div className="flex items-center gap-3">
						<input
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Search name or email"
							className="w-full sm:w-64 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
						/>
						<button
							onClick={fetchUsersAndStats}
							className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
						>
							Refresh
						</button>
					</div>
				</header>

				<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard title="Total Users" value={stats.totalUsers} />
					<StatCard title="Active Today" value={stats.activeToday} />
					<StatCard title="Total Earnings" value={`₦${Number(stats.totalEarnings || 0).toLocaleString()}`} />
					<StatCard title="Total Withdrawn" value={`₦${Number(stats.totalWithdrawn || 0).toLocaleString()}`} />
				</section>

				<section>
					<div className="bg-white rounded-2xl overflow-hidden shadow">
						<div className="p-4 border-b">
							<h2 className="font-semibold">Users ({filtered.length})</h2>
						</div>

						<div className="p-4">
							{loading ? (
								<div className="text-center py-12 text-gray-500">Loading users...</div>
							) : filtered.length === 0 ? (
								<div className="text-center py-12 text-gray-500">No users found</div>
							) : (
								<div className="space-y-3">
									{/* responsive list: cards on small screens, table on larger */}
									<div className="hidden md:block">
										<div className="overflow-x-auto">
										  <table className="w-full text-left">
											<thead className="text-sm text-gray-600 border-b">
												<tr>
													<th className="py-3">Name</th>
													<th>Email</th>
													<th>Balance</th>
													<th>Tasks</th>
													<th>Joined</th>
													<th>Verified</th>
													<th>Status</th>
													<th>Actions</th>
												</tr>
											</thead>
											<tbody>
												{filtered.map((u) => (
													<tr key={u._id} className="border-b hover:bg-gray-50">
														<td className="py-3">{u.name || '—'}</td>
														<td>{u.email || '—'}</td>
														<td className="font-semibold text-green-600">₦{Number(u.balance || 0).toLocaleString()}</td>
														<td>{u.tasksCompleted || 0}</td>
														<td className="text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
														<td>
															<span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.isAccountVerify ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
																{u.isAccountVerify ? 'Verified' : 'Unverified'}
															</span>
														</td>
														<td>
															<UserStatus lastActive={u.lastActive} />
														</td>
														<td>
															<button
																onClick={() => handleDeleteUser(u._id)}
																disabled={deletingId === u._id}
																className="px-3 py-2 rounded-md bg-red-500 text-white"
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

									<div className="md:hidden grid gap-3">
										{filtered.map((u) => (
											<div key={u._id} className="p-4 border rounded-lg">
												<div className="flex items-center justify-between">
													<div>
														<div className="font-semibold">{u.name || '—'}</div>
														<div className="text-sm text-gray-500">{u.email || '—'}</div>
													</div>
													<div className="text-right">
														<div className="font-semibold text-green-600">₦{Number(u.balance || 0).toLocaleString()}</div>
														<div className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</div>
													</div>
												</div>
												<div className="flex items-center justify-between mt-3">
													<div className="text-sm">Tasks: {u.tasksCompleted || 0}</div>
													<div className="flex items-center gap-3">
														<span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.isAccountVerify ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
															{u.isAccountVerify ? 'Verified' : 'Unverified'}
														</span>
														<UserStatus lastActive={u.lastActive} />
													</div>
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
		</Container>
	)
}

function StatCard({ title, value }) {
	return (
		<div className="p-5 bg-gradient-to-r from-indigo-50 to-white rounded-lg border">
			<div className="text-sm text-gray-500">{title}</div>
			<div className="mt-2 text-2xl font-bold">{value}</div>
		</div>
	)
}

function UserStatus({ lastActive }) {
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
		<div className="flex items-center gap-2">
			<span className={`px-2 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
				{isActive ? 'Active' : 'Inactive'}
			</span>
			<span className="text-xs text-gray-500">{last ? timeAgo(last) : 'no activity'}</span>
		</div>
	)
}
