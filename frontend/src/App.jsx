import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Withdraw from './pages/Withdraw'
import Profile from './pages/Profile'
import AdminTasks from './pages/AdminTasks'
import AdminUsers from './pages/AdminUsers'
import CreateTask from './pages/CreateTask'
import MyTasks from './pages/MyTasks'
import AdminCampaigns from './pages/AdminCampaigns'
import AdminPendingPayments from './pages/AdminPendingPayments'
import AdminExchangeRate from './pages/AdminExchangeRate'
import AdminExchangeRateAudit from './pages/AdminExchangeRateAudit'
import CampaignPayment from './pages/CampaignPayment'
import History from './pages/History'
import Referral from './pages/Referral'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import TermsAndConditions from './pages/TermsAndConditions'
import PrivacyPolicy from './pages/PrivacyPolicy'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          {/* <Route path="/admin" element={<AdminTasks />} /> */}
          {/* <Route path="/admin/users" element={<AdminUsers />} /> */}
          {/* <Route path="/history" element={<History />} />
          <Route path="/referral" element={<Referral />} /> */}
          <Route path="/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} /> 
           <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} /> 
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminTasks /></ProtectedRoute>} />
          {/* Protected Routes */}
          {/* <Route path="/profile" element={<Profile />} /> */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          {/* <Route path="/dashboard" element={<Dashboard />} /> */}
          {/* <Route path="/tasks" element={<Tasks />} /> */}
          <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/create-task" element={<ProtectedRoute><CreateTask /></ProtectedRoute>} />
          <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
          <Route path="/admin/campaigns" element={<ProtectedRoute><AdminCampaigns /></ProtectedRoute>} />
          <Route path="/admin/pending-payments" element={<ProtectedRoute><AdminPendingPayments /></ProtectedRoute>} />
          <Route path="/admin/exchange-rate" element={<ProtectedRoute><AdminExchangeRate /></ProtectedRoute>} />
           <Route path="/admin/exchange-rate/audit" element={<ProtectedRoute><AdminExchangeRateAudit /></ProtectedRoute>} />
          <Route path="/campaigns/pay/:id" element={<ProtectedRoute><CampaignPayment /></ProtectedRoute>} />
          {/* <Route path="/withdraw" element={<Withdraw />} /> */}
          <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App