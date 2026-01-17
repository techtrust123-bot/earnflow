// src/pages/History.jsx
import { useEffect, useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import axios from '../utils/axios'
import Container from '../components/Container'
import { useTheme } from '../context/ThemeContext'

export default function History() {
  const { balance } = useSelector(state => state.auth)
  const { isDark } = useTheme()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, credit, debit
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 6
  const [copiedTx, setCopiedTx] = useState(null)

  // Mock data (replace with real API later)
  const mockTransactions = [
    { id: 1, type: 'credit', amount: 250, description: 'Task: Watch 3 TikTok videos', date: '2025-04-20T14:30:00', status: 'success' },
    { id: 2, type: 'credit', amount: 200, description: 'Task: Retweet pinned post', date: '2025-04-19T10:15:00', status: 'success' },
    { id: 3, type: 'debit', amount: 1500, description: 'Withdrawal to GTBank ••••5678', date: '2025-04-18T18:45:00', status: 'success' },
    { id: 4, type: 'credit', amount: 150, description: 'Task: Like Instagram post', date: '2025-04-17T09:20:00', status: 'success' },
    { id: 5, type: 'debit', amount: 500, description: 'Withdrawal to Kuda ••••9012', date: '2025-04-16T12:10:00', status: 'pending' },
    { id: 6, type: 'credit', amount: 100, description: 'Task: Follow on X', date: '2025-04-15T16:55:00', status: 'success' },
  ]

  useEffect(() => {
    // Fetch transactions from backend
    const fetchTx = async () => {
      setLoading(true)
      try {
        const res = await axios.get('/transactions', { headers: { 'X-Skip-Logout': '1' } })
        const txs = (res.data && res.data.transactions) || []
        // normalize date and sort
        txs.sort((a, b) => new Date(b.date) - new Date(a.date))
        setTransactions(txs)
      } catch (err) {
        console.error('fetch transactions error', err)
        // fallback to mock data
        setTransactions(mockTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)))
        toast.error('Could not load transactions, showing recent activity')
      } finally {
        setLoading(false)
      }
    }

    fetchTx()
  }, [])

  // Future: replace with real API
  // useEffect(() => {
  //   const fetch = async () => {
  //     setLoading(true)
  //     const res = await axios.get('/transactions')
  //     setTransactions(res.data || [])
  //     setLoading(false)
  //   }
  //   fetch()
  // }, [])

  const filteredTransactions = useMemo(() => transactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false
    if (search && !(t.description || '').toLowerCase().includes(search.toLowerCase())) return false
    if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false
    if (dateTo && new Date(t.date) > new Date(dateTo)) return false
    return true
  }), [transactions, filter, search, dateFrom, dateTo])

  const exportCSV = (rows) => {
    if (!rows || rows.length === 0) { toast.error('No records to export'); return }
    const header = ['id','type','amount','description','date','status']
    const csv = [header.join(','), ...rows.map(r => [r.id, r.type, r.amount, `"${(r.description||'').replace(/"/g,'""') }"`, r.date, r.status].join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${new Date().toISOString()}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }


  const totalCredit = transactions
    .filter(t => t.type === 'credit' && t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalDebit = transactions
    .filter(t => t.type === 'debit' && t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0)

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-blue-50 to-indigo-50'} flex items-center justify-center transition-colors`}>
        <div className="w-full max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className={`h-8 ${isDark ? 'bg-slate-700' : 'bg-gray-200'} rounded w-1/3 mx-auto`} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`h-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'} rounded`} />
              <div className={`h-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'} rounded`} />
              <div className={`h-24 ${isDark ? 'bg-slate-700' : 'bg-gray-200'} rounded`} />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`h-20 ${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'} py-6 px-4 sm:py-8 lg:py-12 transition-colors`}>
      <Container className="max-w-5xl">
        {/* Header */}
        <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-4">
            Transaction History
          </h1>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-3xl shadow-2xl p-6 text-center"
          >
            <p className="text-lg opacity-90 mb-2">Total Earnings</p>
            <p className="text-4xl font-extrabold">₦{totalCredit.toLocaleString()}</p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-3xl shadow-2xl p-6 text-center"
          >
            <p className="text-lg opacity-90 mb-2">Total Withdrawn</p>
            <p className="text-4xl font-extrabold">₦{totalDebit.toLocaleString()}</p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl shadow-2xl p-6 text-center"
          >
            <p className="text-lg opacity-90 mb-2">Current Balance</p>
            <p className="text-4xl font-extrabold">₦{(balance || 0).toLocaleString()}</p>
          </motion.div>
        </div>

        {/* Controls (responsive) */}
        <div className="mb-8">
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3 `}>
            <input aria-label="Search description" placeholder="Search description" value={search} onChange={e => setSearch(e.target.value)} className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'border-gray-300 bg-white text-gray-900'} transition-colors`} />
            <select aria-label="Filter type" value={filter} onChange={e => setFilter(e.target.value)} className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'border-gray-300 bg-white text-gray-900'} transition-colors`}>
              <option value="all">All</option>
              <option value="credit">Earnings</option>
              <option value="debit">Withdrawals</option>
            </select>
            <input aria-label="Date from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'border-gray-300 bg-white text-gray-900'} transition-colors`} />
            <input aria-label="Date to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'border-gray-300 bg-white text-gray-900'} transition-colors`} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => exportCSV(filteredTransactions)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Export CSV</button>
              <button onClick={() => { setSearch(''); setFilter('all'); setDateFrom(''); setDateTo(''); }} className={`px-4 py-2 border rounded-lg ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-900 hover:bg-gray-50'} transition-colors`}>Reset</button>
            </div>
            <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Showing <strong>{filteredTransactions.length}</strong> records</div>
          </div>
        </div>

        {/* Transaction List */}
        <div className={`${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-blue-100'} backdrop-blur-xl rounded-3xl shadow-2xl border overflow-hidden transition-colors`}>
          <div className={`p-6 ${isDark ? 'bg-gradient-to-r from-slate-800 to-slate-700' : 'bg-gradient-to-r from-blue-600 to-indigo-700'} flex items-center justify-between transition-colors`}>
            <h2 className="text-2xl font-bold text-white">
              {filter === 'all' ? 'All Transactions' : filter === 'credit' ? 'Earnings' : 'Withdrawals'}
            </h2>
            <div className="text-white/90">{filteredTransactions.length} records</div>
          </div>

          <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-200'} transition-colors`}>
            {filteredTransactions.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-gray-500 text-xl">
                No {filter === 'all' ? '' : filter === 'credit' ? 'earnings' : 'withdrawals'} yet
              </motion.div>
            ) : (
              <>
                {/* Mobile: stacked cards */}
                <div className="md:hidden">
                  <AnimatePresence>
                    {filteredTransactions.slice((page-1)*perPage, page*perPage).map((tx, index) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4 hover:bg-gray-50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                              tx.type === 'credit' ? 'bg-green-100 text-green-600' : tx.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {tx.type === 'credit' ? '💰' : tx.status === 'pending' ? '⏳' : '🏦'}
                            </div>
                            <div>
                              <p className="font-bold text-md text-gray-800">{tx.description}</p>
                              <p className="text-sm text-gray-500">{new Date(tx.date).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-extrabold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.type === 'credit' ? '+' : '-'}₦{Number(tx.amount || 0).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2 justify-end mt-1">
                              <button onClick={async () => { try { await navigator.clipboard.writeText(String(tx.amount)); setCopiedTx(tx.id); setTimeout(()=>setCopiedTx(null),1200); toast.success('Amount copied') } catch(e){toast.error('Copy failed')} }} className="text-xs text-gray-500 px-2 py-1 rounded-md border">Copy</button>
                              <span className={`text-sm font-bold ${tx.status === 'success' ? 'text-green-600' : 'text-yellow-600'}`}>{tx.status === 'success' ? 'Completed' : 'Pending'}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Desktop: table */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-6 py-4">Date</th>
                        <th className="text-left px-6 py-4">Description</th>
                        <th className="text-left px-6 py-4">Type</th>
                        <th className="text-right px-6 py-4">Amount</th>
                        <th className="text-left px-6 py-4">Status</th>
                        <th className="text-right px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.slice((page-1)*perPage, page*perPage).map(tx => (
                        <tr key={tx.id} className="border-t">
                          <td className="px-6 py-4 text-sm text-gray-600">{new Date(tx.date).toLocaleString()}</td>
                          <td className="px-6 py-4">{tx.description}</td>
                          <td className="px-6 py-4 capitalize">{tx.type}</td>
                          <td className={`px-6 py-4 text-right font-bold ${tx.type==='credit' ? 'text-green-600' : 'text-red-600'}`}>{tx.type === 'credit' ? '+' : '-'}₦{Number(tx.amount || 0).toLocaleString()}</td>
                          <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-sm ${tx.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{tx.status}</span></td>
                          <td className="px-6 py-4 text-right"><button onClick={async () => { try { await navigator.clipboard.writeText(String(tx.amount)); toast.success('Amount copied') } catch(e){toast.error('Copy failed')} }} className="px-3 py-1 rounded border text-sm">Copy</button></td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pagination */}
        {filteredTransactions.length > perPage && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-2 rounded border">Prev</button>
            <div className="px-4 py-2">Page {page} / {Math.ceil(filteredTransactions.length / perPage)}</div>
            <button onClick={() => setPage(p => Math.min(Math.ceil(filteredTransactions.length / perPage), p+1))} className="px-3 py-2 rounded border">Next</button>
          </div>
        )}

        {/* Floating Balance */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-20 right-6 md:hidden z-50"
        >
          <div className={`${isDark ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-blue-600 to-indigo-700'} text-white p-5 rounded-full shadow-2xl border-4 border-white transition-colors`}>
            <p className="text-center">
              <span className="block text-xs font-bold">Balance</span>
              <span className="text-2xl font-extrabold">₦{(balance || 0).toLocaleString()}</span>
            </p>
          </div>
        </motion.div>
      </Container>
    </div>
  )
}