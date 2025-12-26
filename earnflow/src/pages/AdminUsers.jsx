import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import Container from '../components/Container'
import axios from '../utils/axios'

export default function AdminUsers() {
	const { token } = useSelector((s) => s.auth)
	const [users, setUsers] = useState([])
	const [stats, setStats] = useState({ totalUsers: 0, activeToday: 0, totalEarnings: 0, totalWithdrawn: 0 })
	const [q, setQ] = useState('')
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		fetchUsersAndStats()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token])

	const fetchUsersAndStats = async () => {
		setLoading(true)
		try {
			const [usersRes, statsRes] = await Promise.all([
				axios.get('/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
				axios.get('/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
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
							className="w-64 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
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
										<table className="w-full text-left">
											<thead className="text-sm text-gray-600 border-b">
												<tr>
													<th className="py-3">Name</th>
													<th>Email</th>
													<th>Balance</th>
													<th>Tasks</th>
													<th>Joined</th>
													<th>Status</th>
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
															<UserStatus lastActive={u.lastActive} />
														</td>
													</tr>
												))}
											</tbody>
										</table>
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
													<UserStatus lastActive={u.lastActive} />
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
	const isActive = lastActive && new Date(lastActive) > new Date(Date.now() - 86400000)
	return (
		<span className={`px-2 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
			{isActive ? 'Active' : 'Inactive'}
		</span>
	)
}
