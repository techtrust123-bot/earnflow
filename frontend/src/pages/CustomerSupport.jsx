import { useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import axios from '../utils/axios'
import { useTheme } from '../context/ThemeContext'
import Container from '../components/Container'
import toast from 'react-hot-toast'

export default function CustomerSupport() {
  const { user } = useSelector(state => state.auth)
  const { isDark } = useTheme()
  const [supportMessages, setSupportMessages] = useState([])
  const [supportInput, setSupportInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('general')
  const [chartData, setChartData] = useState({
    labels: ['12am', '1am', '2am', '3am', '4am', '5am'],
    userMessages: [5, 8, 6, 10, 14, 18],
    adminResponses: [3, 5, 4, 7, 10, 12],
    activeConversations: [2, 4, 3, 5, 8, 10],
    support: [2, 3, 2, 4, 5, 6],
    resolved: [1, 2, 1, 3, 4, 5],
    avgUserMessages: 10,
    avgAdminResponses: 7,
    avgActiveConversations: 5,
    avgCustomers: 10,
    avgSupport: 3,
    avgResolved: 2
  })

  // Load support messages and chart data from backend
  useEffect(() => {
    let mounted = true
    const loadSupport = async () => {
      try {
        // Fetch support messages
        const msgRes = await axios.get('/support/messages')
        if (mounted && msgRes.data.success) {
          setSupportMessages(msgRes.data.messages)
        }

        // Fetch chart data
        const statsRes = await axios.get('/support/stats/live')
        if (mounted && statsRes.data.success) {
          setChartData(statsRes.data.chart)
        }
      } catch (err) {
        console.warn('Could not load support data', err)
      }
    }
    if (user?._id) loadSupport()
    
    // Refresh chart every 30 seconds
    const interval = setInterval(loadSupport, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [user])

  const sendSupportMessage = async () => {
    if (!supportInput.trim()) return
    setLoading(true)
    try {
      const res = await axios.post('/support/send', {
        message: supportInput,
        category: selectedCategory
      })
      if (res.data.success) {
        setSupportInput('')
        toast.success('Message sent! Support team will respond shortly.')
        // Reload messages after sending
        const msgRes = await axios.get('/support/messages')
        if (msgRes.data.success) {
          setSupportMessages(msgRes.data.messages)
        }
      }
    } catch (err) {
      console.error('Error sending message:', err)
      toast.error(err.response?.data?.message || 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendSupportMessage()
    }
  }

  // Chart showing interaction between users and admin
  const renderChart = () => {
    if (!chartData?.userMessages || !chartData?.adminResponses || !chartData?.activeConversations) return null

    const maxValue = Math.max(
      Math.max(...(chartData.userMessages || [])),
      Math.max(...(chartData.adminResponses || [])),
      Math.max(...(chartData.activeConversations || []))
    )
    const barSpacing = 45
    const startX = 50

    return (
      <svg width="100%" height="220" viewBox="0 0 550 220" className="w-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line key={`grid-${i}`} x1="45" y1={180 - ratio * 140} x2="540" y2={180 - ratio * 140} stroke={isDark ? '#475569' : '#e5e7eb'} strokeWidth="1" />
        ))}
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <text key={`label-${i}`} x="35" y={185 - ratio * 140} fontSize="12" fill={isDark ? '#94a3b8' : '#6b7280'} textAnchor="end" dominantBaseline="middle">
            {Math.round(maxValue * ratio)}
          </text>
        ))}

        {/* Bars - User messages (blue), Admin responses (cyan), Active conversations (green) */}
        {(chartData.labels || []).map((label, i) => {
          const userHeight = ((chartData.userMessages?.[i] || 0) / maxValue) * 140
          const adminHeight = ((chartData.adminResponses?.[i] || 0) / maxValue) * 140
          const convHeight = ((chartData.activeConversations?.[i] || 0) / maxValue) * 140
          const x = startX + i * barSpacing
          
          return (
            <g key={`bars-${i}`}>
              <rect x={x - 18} y={180 - userHeight} width="6" height={userHeight} fill="#3b82f6" />
              <rect x={x - 6} y={180 - adminHeight} width="6" height={adminHeight} fill="#06b6d4" />
              <rect x={x + 6} y={180 - convHeight} width="6" height={convHeight} fill="#10b981" />
              <text x={x} y="200" fontSize="12" fill={isDark ? '#94a3b8' : '#6b7280'} textAnchor="middle">{label}</text>
            </g>
          )
        })}

        {/* Legend */}
        <g>
          <rect x="60" y="5" width="8" height="8" fill="#3b82f6" />
          <text x="75" y="11" fontSize="11" fill={isDark ? '#cbd5e1' : '#374151'}>User Messages</text>
          
          <rect x="230" y="5" width="8" height="8" fill="#06b6d4" />
          <text x="245" y="11" fontSize="11" fill={isDark ? '#cbd5e1' : '#374151'}>Admin Responses</text>
          
          <rect x="420" y="5" width="8" height="8" fill="#10b981" />
          <text x="435" y="11" fontSize="11" fill={isDark ? '#cbd5e1' : '#374151'}>Active Conversations</text>
        </g>
      </svg>
    )
  }

  return (
    <Container className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className={`text-3xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>💬 Customer Support</h1>
        <p className={`transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Get help from our support team • Average response time: 5 minutes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Section */}
        <div className={`lg:col-span-2 p-6 rounded-2xl shadow space-y-4 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
          <h2 className={`text-lg font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Live Chat</h2>
          
          {/* Messages */}
          <div className={`overflow-y-auto max-h-96 space-y-3 p-4 rounded-lg transition-colors ${isDark ? 'bg-slate-900/50 border border-slate-700' : 'bg-gray-50'}`}>
            {supportMessages && supportMessages.length > 0 ? (
              supportMessages.map((msg, idx) => {
                const msgTime = msg.time instanceof Date ? msg.time : new Date(msg.time)
                const isUser = msg.sender === 'You'
                return (
                  <div key={msg.id || idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-lg transition-colors ${isUser ? 'bg-indigo-600 text-white rounded-br-none' : (isDark ? 'bg-slate-700 text-slate-50' : 'bg-gray-200 text-gray-900') + ' rounded-bl-none'}`}>
                      <p className="text-sm">{msg.message}</p>
                      <span className={`text-xs ${isUser ? 'text-indigo-100' : (isDark ? 'text-slate-400' : 'text-gray-600')}`}>
                        {msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.status && (
                        <span className={`text-xs ml-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>
                          ({msg.status})
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className={`text-center text-sm transition-colors ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                No messages yet. Start a conversation!
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="space-y-3 border-t border-gray-300 pt-4">
            {/* Category Select */}
            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              className={`w-full p-2 rounded-lg border transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50' : 'bg-white border-gray-300'}`}
            >
              <option value="general">General Inquiry</option>
              <option value="payment">Payment Issue</option>
              <option value="task">Task Problem</option>
              <option value="withdrawal">Withdrawal Issue</option>
              <option value="account">Account Problem</option>
              <option value="other">Other</option>
            </select>

            {/* Message Input */}
            <div className="flex gap-2">
              <textarea 
                value={supportInput} 
                onChange={e => setSupportInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here... (Shift+Enter for new line)"
                rows="3"
                className={`flex-1 p-3 rounded-lg border transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400' : 'bg-white border-gray-300 placeholder-gray-500'}`}
              />
            </div>
            <button 
              onClick={sendSupportMessage}
              disabled={loading || !supportInput.trim()}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>

          {/* Info */}
          <div className={`text-xs space-y-1 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            <div>✅ <span className="inline">Your message is secure and encrypted</span></div>
            <div>🕐 <span className="inline">Support team responds 24/7</span></div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Live Support Stats */}
          <div className={`p-6 rounded-2xl shadow transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>📊 Live Stats</h3>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg transition-colors ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <div className={`text-xs transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Active Support Team</div>
                <div className="text-2xl font-bold text-purple-600">
                  {chartData.support && chartData.support.length > 0 ? Math.max(...chartData.support) : 0}
                </div>
              </div>
              <div className={`p-3 rounded-lg transition-colors ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <div className={`text-xs transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Resolved Today</div>
                <div className="text-2xl font-bold text-green-600">
                  {chartData.resolved && chartData.resolved.length > 0 ? chartData.resolved.reduce((a, b) => a + b, 0) : 0}
                </div>
              </div>
              <div className={`p-3 rounded-lg transition-colors ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <div className={`text-xs transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Avg Response</div>
                <div className="text-2xl font-bold text-blue-600">5 min</div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className={`p-6 rounded-2xl shadow transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>📚 Quick Help</h3>
            <div className="space-y-2">
              <a href="#" className="block p-2 rounded-lg hover:bg-slate-700 transition-colors text-indigo-600 text-sm">
                • How to complete tasks
              </a>
              <a href="#" className="block p-2 rounded-lg hover:bg-slate-700 transition-colors text-indigo-600 text-sm">
                • Withdrawal process
              </a>
              <a href="#" className="block p-2 rounded-lg hover:bg-slate-700 transition-colors text-indigo-600 text-sm">
                • Account verification
              </a>
              <a href="#" className="block p-2 rounded-lg hover:bg-slate-700 transition-colors text-indigo-600 text-sm">
                • Payment methods
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Interaction Chart */}
      <div className={`p-6 rounded-2xl shadow transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
        <h3 className={`text-lg font-bold mb-4 transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>📈 Support Activity (Last 6 Hours)</h3>
        <div className={`overflow-x-auto transition-colors ${isDark ? 'text-slate-300' : ''}`}>
          {renderChart()}
          <div className={`mt-4 grid grid-cols-3 gap-3 text-center text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            <div>
              <div className="font-semibold text-blue-600">Avg: {chartData.avgCustomers || 18.3}</div>
              <div>Customer Queries</div>
            </div>
            <div>
              <div className="font-semibold text-purple-600">Avg: {chartData.avgSupport || 10.2}</div>
              <div>Active Support</div>
            </div>
            <div>
              <div className="font-semibold text-green-600">Avg: {chartData.avgResolved || 8.8}</div>
              <div>Resolved Issues</div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}
