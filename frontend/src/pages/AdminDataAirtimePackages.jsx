import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import axios from '../utils/axios'
import { useTheme } from '../context/ThemeContext'
import Container from '../components/Container'
import toast from 'react-hot-toast'

export default function AdminDataAirtimePackages() {
  const { user } = useSelector(state => state.auth)
  const { isDark } = useTheme()
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'data',
    provider: '',
    amount: '',
    balance: '',
    description: '',
    icon: '📦'
  })

  // Check admin access
  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Admin access required')
      window.history.back()
    }
  }, [user])

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/data-airtime/admin/packages')
      if (res.data.success) {
        setPackages(res.data.packages)
      }
    } catch (err) {
      console.error('Error loading packages:', err)
      toast.error('Failed to load packages')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPackage = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.provider || !formData.amount || !formData.balance) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      const res = await axios.post('/data-airtime/admin/packages', {
        ...formData,
        amount: parseInt(formData.amount),
        balance: parseInt(formData.balance)
      })

      if (res.data.success) {
        toast.success('Package created successfully')
        setFormData({
          name: '',
          type: 'data',
          provider: '',
          amount: '',
          balance: '',
          description: '',
          icon: '📦'
        })
        setShowForm(false)
        loadPackages()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create package')
    }
  }

  const handleDeletePackage = async (id) => {
    if (!window.confirm('Deactivate this package?')) return

    try {
      const res = await axios.delete(`/data-airtime/admin/packages/${id}`)
      if (res.data.success) {
        toast.success('Package deactivated')
        loadPackages()
      }
    } catch (err) {
      toast.error('Failed to deactivate package')
    }
  }

  const dataPackages = packages.filter(p => p.type === 'data')
  const airtimePackages = packages.filter(p => p.type === 'airtime')

  return (
    <Container className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className={`text-3xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
            ⚙️ Data & Airtime Packages
          </h1>
          <p className={`transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Manage available data and airtime packages
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            isDark
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {showForm ? '✕ Cancel' : '+ New Package'}
        </button>
      </div>

      {/* Add Package Form */}
      {showForm && (
        <div className={`rounded-lg p-6 space-y-4 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`text-lg font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
            Create New Package
          </h3>

          <form onSubmit={handleAddPackage} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Package Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-slate-50'
                      : 'bg-white border-gray-300'
                  }`}
                  placeholder="e.g., 1GB Data"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-slate-50'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="data">Data</option>
                  <option value="airtime">Airtime</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Provider *
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-slate-50'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">Select Provider</option>
                  <option value="MTN">MTN</option>
                  <option value="Airtel">Airtel</option>
                  <option value="Glo">Glo</option>
                  <option value="9mobile">9mobile</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Price (₦) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-slate-50'
                      : 'bg-white border-gray-300'
                  }`}
                  placeholder="1000"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {formData.type === 'data' ? 'Data Amount (MB)' : 'Airtime Amount (₦)'} *
                </label>
                <input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-slate-50'
                      : 'bg-white border-gray-300'
                  }`}
                  placeholder={formData.type === 'data' ? '1000' : '1000'}
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Icon
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-slate-700 border-slate-600 text-slate-50'
                      : 'bg-white border-gray-300'
                  }`}
                  placeholder="📦"
                  maxLength="2"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 transition-colors ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-50'
                    : 'bg-white border-gray-300'
                }`}
                placeholder="Package description"
                rows="3"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                isDark
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Create Package
            </button>
          </form>
        </div>
      )}

      {/* Data Packages */}
      <div className="space-y-4">
        <h2 className={`text-2xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
          📱 Data Packages ({dataPackages.length})
        </h2>

        {loading ? (
          <div className={`text-center py-12 rounded-lg transition-colors ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Loading...</p>
          </div>
        ) : dataPackages.length === 0 ? (
          <div className={`text-center py-12 rounded-lg transition-colors ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>No data packages</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataPackages.map((pkg) => (
              <div key={pkg._id} className={`rounded-lg p-4 space-y-3 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                      {pkg.name}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{pkg.provider}</p>
                  </div>
                  <span className="text-2xl">{pkg.icon}</span>
                </div>

                <div className="space-y-1">
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    <strong>Price:</strong> ₦{pkg.amount}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    <strong>Data:</strong> {pkg.balance}MB
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    {pkg.description}
                  </p>
                </div>

                <button
                  onClick={() => handleDeletePackage(pkg._id)}
                  className="w-full py-2 rounded-lg text-red-600 hover:bg-red-100 font-semibold transition-colors"
                >
                  Deactivate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Airtime Packages */}
      <div className="space-y-4">
        <h2 className={`text-2xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
          📞 Airtime Packages ({airtimePackages.length})
        </h2>

        {airtimePackages.length === 0 ? (
          <div className={`text-center py-12 rounded-lg transition-colors ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <p className={`${isDark ? 'text-slate-400' : 'text-gray-600'}`}>No airtime packages</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {airtimePackages.map((pkg) => (
              <div key={pkg._id} className={`rounded-lg p-4 space-y-3 transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>
                      {pkg.name}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{pkg.provider}</p>
                  </div>
                  <span className="text-2xl">{pkg.icon}</span>
                </div>

                <div className="space-y-1">
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    <strong>Price:</strong> ₦{pkg.amount}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    <strong>Airtime:</strong> ₦{pkg.balance}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    {pkg.description}
                  </p>
                </div>

                <button
                  onClick={() => handleDeletePackage(pkg._id)}
                  className="w-full py-2 rounded-lg text-red-600 hover:bg-red-100 font-semibold transition-colors"
                >
                  Deactivate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}
