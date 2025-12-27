// src/components/Layout.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import { logout } from '../features/auth/authSlice'
import axios from '../utils/axios'
import toast from 'react-hot-toast'
import Container from './Container'

export default function Layout({ children }) {
  const { isAuthenticated, user, balance, userType } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout')
      dispatch(logout())
      toast.success('Logged out')
      navigate('/login')
    } catch (err) {
      console.error(err)
      dispatch(logout())
      navigate('/login')
    }
  }

  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close mobile drawer when user logs out or auth state changes
  useEffect(() => {
    if (!isAuthenticated) setMobileOpen(false)
  }, [isAuthenticated])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {isAuthenticated && (
        <aside className="hidden md:flex md:flex-col bg-white border-r border-gray-100 shadow-sm p-4 sticky top-0 h-screen transition-all">
          <SidebarContent
            user={user}
            userType={userType}
            balance={balance}
            isAuthenticated={isAuthenticated}
            onLogout={handleLogout}
          />
        </aside>
      )}

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30">
          <Container>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
              {isAuthenticated && (
                <button aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(prev => !prev)} className="md:hidden p-2 rounded-md hover:bg-gray-100 text-gray-700">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
              <Link to="/" className="text-xl font-bold text-indigo-600">Earnflow</Link>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <div className="hidden sm:flex items-center gap-3" aria-hidden={!isAuthenticated}>
                  <div className="text-sm text-gray-500">Balance</div>
                  <div className="font-semibold">₦{(Number(balance) || 0).toLocaleString()}</div>
                </div>
              )}

              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Link to="/profile" className="hidden sm:inline-block px-3 py-2 rounded-md hover:bg-gray-100">Profile</Link>
                  <button onClick={handleLogout} className="px-3 py-2 bg-indigo-600 text-white rounded-md">Logout</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="px-3 py-2 rounded-md hover:bg-gray-100">Login</Link>
                  <Link to="/signup" className="px-3 py-2 bg-indigo-600 text-white rounded-md">Sign Up</Link>
                </div>
              )}
            </div>
          </div>
          </Container>
        </header>

        <main className="flex-1 p-6 w-full">
          <Container>
            {children}
          </Container>
        </main>

        {isAuthenticated && (
          <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white rounded-2xl shadow-lg p-3 z-40" role="navigation" aria-label="Primary mobile navigation">
            <div className="flex justify-around">
              <Link to="/dashboard" className="flex flex-col items-center text-xs" aria-label="Home">🏠<span>Home</span></Link>
              <Link to="/tasks" className="flex flex-col items-center text-xs" aria-label="Tasks">📝<span>Tasks</span></Link>
              <Link to="/history" className="flex flex-col items-center text-xs" aria-label="History">⏳<span>History</span></Link>
              <Link to="/withdraw" className="flex flex-col items-center text-xs" aria-label="Withdraw">💸<span>Withdraw</span></Link>
              <Link to="/profile" className="flex flex-col items-center text-xs" aria-label="Profile">👤<span>Profile</span></Link>
            </div>
          </nav>
        )}

        {mobileOpen && isAuthenticated && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div className="relative w-72 bg-white h-full shadow-xl">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">E</div>
                    <div className="text-lg font-semibold">Earnflow</div>
                  </Link>
                  <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="p-2 rounded-md hover:bg-gray-100">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-auto">
                  <SidebarContent
                    user={user}
                    userType={userType}
                    balance={balance}
                    isAuthenticated={isAuthenticated}
                    onLogout={() => { setMobileOpen(false); handleLogout() }}
                    isMobile={true}
                    onNavigate={() => setMobileOpen(false)}
                  />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarContent({ user, userType, balance, isAuthenticated, onLogout, isMobile = false, onNavigate }) {
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 13h8V3H3v10zM13 21h8V11h-8v10z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { to: '/tasks', label: 'Tasks', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { to: '/withdraw', label: 'Withdraw', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 12h8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { to: '/profile', label: 'Profile', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { to: '/history', label: 'History', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12a9 9 0 1 0-3 6.7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 7v5l3 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) }
  ]

  if (userType === 'admin') {
    navItems.push({ to: '/admin', label: 'Admin', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>), admin: true })
    navItems.push({ to: '/admin/campaigns', label: 'Campaigns', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>), admin: true })
    navItems.push({ to: '/admin/pending-payments', label: 'Pending Payments', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>), admin: true })
  }

  useEffect(() => {
    function onKey(e) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey
      if (modifier && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        const next = !collapsed
        setCollapsed(next)
        // Preference is not persisted; backend-managed UI state preferred
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [collapsed])

  const width = isMobile ? '100%' : (collapsed ? 88 : 288)

  const effectiveCollapsed = isMobile ? false : collapsed

  return (
    <div className={`flex flex-col h-full transition-all ${isMobile ? 'w-full' : ''}`} style={{ width }} role="navigation" aria-label="Main navigation">
      <div className="flex items-center justify-between px-2">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">E</div>
          {!collapsed && <div className="text-lg font-semibold">Earnflow</div>}
        </Link>
        <button onClick={() => { const next = !collapsed; setCollapsed(next); }} className="p-1 rounded-md hover:bg-gray-100">
          <svg className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div className="mt-6 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">{user?.name?.charAt(0) || 'U'}</div>
          {!collapsed && (
            <div>
              <div className="font-semibold">{user?.name || 'Guest'}</div>
              <div className="text-xs text-gray-500">{user?.email || ''}</div>
            </div>
          )}
        </div>
      </div>

      <nav className="mt-6 flex-1 px-2">
        <ul className="space-y-2">
          {navItems.map((n, i) => {
            const active = location.pathname === n.to
            if (isMobile) {
              return (
                <li key={i}>
                  <Link
                    to={n.to}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onNavigate?.()}
                    className={`block w-full text-left px-4 py-3 rounded-lg flex items-center gap-4 ${active ? 'bg-indigo-50' : 'hover:bg-indigo-50'}`}
                  >
                    <div className="text-2xl">{n.icon}</div>
                    <div className={`text-base ${n.admin ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>{n.label}</div>
                  </Link>
                </li>
              )
            }

            return (
              <li key={i}>
                <Link to={n.to} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 px-2 py-2 rounded-md ${active ? 'bg-indigo-50' : 'hover:bg-indigo-50'}`}>
                  <div className="text-indigo-600">{n.icon}</div>
                  {!effectiveCollapsed && <div className={`text-sm ${n.admin ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>{n.label}</div>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-auto px-2 pb-4">
        <div className="text-xs text-gray-500 mb-2">Balance</div>
        {isMobile ? (
          <div className="space-y-3">
            <div className="font-bold text-lg">₦{(Number(balance) || 0).toLocaleString()}</div>
            {isAuthenticated ? (
              <button onClick={() => { onLogout?.(); onNavigate?.() }} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg">Logout</button>
            ) : (
              <Link to="/login" onClick={() => onNavigate?.()} className="w-full inline-block text-center px-4 py-3 bg-indigo-600 text-white rounded-lg">Login</Link>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            {!effectiveCollapsed && <div className="font-bold">₦{(Number(balance) || 0).toLocaleString()}</div>}
            {isAuthenticated ? (
              <button onClick={onLogout} className="px-3 py-2 bg-indigo-600 text-white rounded-md">Logout</button>
            ) : (
              <Link to="/login" className="px-3 py-2 bg-indigo-600 text-white rounded-md">Login</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}