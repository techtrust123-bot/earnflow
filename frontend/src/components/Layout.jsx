// src/components/Layout.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import { logout } from '../features/auth/authSlice'
import axios from '../utils/axios'
import toast from 'react-hot-toast'
import Container from './Container'
import { useTheme } from '../context/ThemeContext'

export default function Layout({ children }) {
  const { isAuthenticated, user, balance, userType } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { isDark, toggleTheme } = useTheme()

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
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-800'} flex transition-colors duration-300`}>
  
      {isAuthenticated && user && user.isAccountVerify && (
        <aside className={`hidden md:flex md:flex-col ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'} border-r shadow-sm p-4 sticky top-0 h-screen transition-all transition-colors`}>
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
        <header className={`${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'} border-b p-3 sm:p-4 sticky top-0 z-30 transition-colors`}>
          <Container>
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {isAuthenticated && user && user.isAccountVerify && (
                <button aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(prev => !prev)} className={`md:hidden p-2 rounded-md flex-shrink-0 ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
              <Link to="/" className="text-lg sm:text-xl font-bold text-indigo-600 whitespace-nowrap">Earnflow</Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {isAuthenticated && user && user.isAccountVerify ? (
                <div className="hidden md:flex items-center gap-2 sm:gap-3 text-right" aria-hidden={!isAuthenticated}>
                  <div className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Balance</div>
                  <div className="font-semibold text-sm sm:text-base">₦{(Number(balance) || 0).toLocaleString()}</div>
                </div>
              ) : null}

              <button
                onClick={toggleTheme}
                className={`p-2 rounded-md flex-shrink-0 ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v1m0 16v1m8.485-8.485h1m-17.97 0h1M19.828 4.172l-.707.707m-12.242 0l-.707-.707M19.828 19.828l-.707-.707m-12.242 0l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/></svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>

              {isAuthenticated && user && user.isAccountVerify && (
                <Link 
                  to="/support" 
                  className={`p-2 rounded-md flex-shrink-0 ${isDark ? 'hover:bg-slate-800 text-cyan-400' : 'hover:bg-gray-100 text-cyan-600'}`}
                  aria-label="Customer Support"
                  title="Customer Support"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </Link>
              )}

              {/* If not authenticated show login/signup. If authenticated but not verified show verify CTA + logout */}
              {!isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link to="/login" className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-sm sm:text-base ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>Login</Link>
                  <Link to="/signup" className="px-2 sm:px-3 py-1 sm:py-2 bg-indigo-600 text-white rounded-md text-sm sm:text-base">Sign Up</Link>
                </div>
              ) : user && !user.isAccountVerify ? (
                <div className="flex items-center gap-2">
                  <Link to="/verify-email" className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-sm sm:text-base ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>Verify</Link>
                  <button onClick={handleLogout} className="px-2 sm:px-3 py-1 sm:py-2 bg-indigo-600 text-white rounded-md text-sm sm:text-base">Logout</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/profile" className={`hidden sm:inline-block px-2 sm:px-3 py-1 sm:py-2 rounded-md text-sm sm:text-base ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>Profile</Link>
                  <button onClick={handleLogout} className="px-2 sm:px-3 py-1 sm:py-2 bg-indigo-600 text-white rounded-md text-sm sm:text-base">Logout</button>
                </div>
              )}
            </div>
          </div>
          </Container>
        </header>

        {/* Show verification prompt for logged in but unverified users */}
        {isAuthenticated && user && !user.isAccountVerify && (
          <div className={`${isDark ? 'bg-yellow-900 border-yellow-700 text-yellow-200' : 'bg-yellow-50 border-yellow-200 text-yellow-800'} border-b p-3 text-center`}>
            Your email is not verified. <Link to="/verify-email" className="font-semibold underline">Verify now</Link>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 w-full pb-20 md:pb-6">
          <Container>
            {children}
          </Container>
        </main>

        {isAuthenticated && user && user.isAccountVerify && (
          <nav className={`md:hidden fixed bottom-4 left-4 right-4 ${isDark ? 'bg-slate-900 shadow-2xl' : 'bg-white shadow-lg'} rounded-2xl p-2 z-40 transition-colors`} role="navigation" aria-label="Primary mobile navigation">
            <div className="flex justify-around items-center">
              <Link to="/dashboard" className="flex flex-col items-center gap-1 p-2 text-xs sm:text-sm transition hover:opacity-70" aria-label="Home">
                <span className="text-lg sm:text-2xl">🏠</span>
                <span className="hidden sm:inline">Home</span>
              </Link>
              <Link to="/tasks" className="flex flex-col items-center gap-1 p-2 text-xs sm:text-sm transition hover:opacity-70" aria-label="Tasks">
                <span className="text-lg sm:text-2xl">📝</span>
                <span className="hidden sm:inline">Tasks</span>
              </Link>
              <Link to="/support" className="flex flex-col items-center gap-1 p-2 text-xs sm:text-sm transition hover:opacity-70" aria-label="Support">
                <span className="text-lg sm:text-2xl">💬</span>
                <span className="hidden sm:inline">Support</span>
              </Link>
              <Link to="/withdraw" className="flex flex-col items-center gap-1 p-2 text-xs sm:text-sm transition hover:opacity-70" aria-label="Withdraw">
                <span className="text-lg sm:text-2xl">💸</span>
                <span className="hidden sm:inline">Withdraw</span>
              </Link>
              <Link to="/profile" className="flex flex-col items-center gap-1 p-2 text-xs sm:text-sm transition hover:opacity-70" aria-label="Profile">
                <span className="text-lg sm:text-2xl">👤</span>
                <span className="hidden sm:inline">Profile</span>
              </Link>
            </div>
          </nav>
        )}

        {mobileOpen && isAuthenticated && user && user.isAccountVerify && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div className={`relative w-72 ${isDark ? 'bg-slate-900' : 'bg-white'} h-full shadow-xl transition-colors`}>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">E</div>
                    <div className="text-lg font-semibold">Earnflow</div>
                  </Link>
                  <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className={`p-2 rounded-md ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
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
    { to: '/buy-data-airtime', label: 'Buy Data & Airtime', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M2 12h20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { to: '/set-transaction-pin', label: 'Set PIN', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1v22M4.22 4.22l12.73 12.73M19.78 4.22L7.05 16.95" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { to: '/withdraw', label: 'Withdraw', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 12h8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { to: '/profile', label: 'Profile', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { to: '/history', label: 'History', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12a9 9 0 1 0-3 6.7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 7v5l3 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) }
  ]

  if (userType === 'admin') {
    navItems.push({ to: '/admin', label: 'Admin', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>), admin: true })
    navItems.push({ to: '/admin/campaigns', label: 'Campaigns', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>), admin: true })
    navItems.push({ to: '/admin/pending-payments', label: 'Pending Payments', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>), admin: true })
      navItems.push({ to: '/admin/exchange-rate', label: 'Exchange Rate', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>), admin: true })
      navItems.push({ to: '/admin/exchange-rate/audit', label: 'Exchange Rate Audit', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>), admin: true })
    navItems.push({ to: '/admin/data-airtime-packages', label: 'Data & Airtime', icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M2 12h20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>), admin: true })
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