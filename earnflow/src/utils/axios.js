// src/utils/axiosConfig.js
import axios from 'axios'
import store from '../app/store'  // ← Adjust path to your Redux store
import { logout } from '../features/auth/authSlice'

// Set base URL
axios.defaults.baseURL = 'http://localhost:5000/api'

// Send cookies (if backend uses them)
axios.defaults.withCredentials = true

// Default content type
axios.defaults.headers.common['Content-Type'] = 'application/json'

// Request interceptor — adds Bearer token from Redux store
axios.interceptors.request.use((config) => {
  const token = store.getState().auth.token  // ← Get token from Redux

  // attach bearer token when available
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    // Helpful debug: show when a request is sent without a token
    // (do not log full token values to avoid leaking secrets)
    // Temporary: log token presence and masked snippet for debugging
    try {
      const masked = token ? `${String(token).slice(0,6)}...${String(token).slice(-6)}` : null
      // eslint-disable-next-line no-console
      console.debug('[axios] request', { url: config.url, hasToken: !!token, token: masked })
    } catch (e) {
      // ignore
    }
  }

  return config
}, (error) => {
  return Promise.reject(error)
})

// Response interceptor: handle 401 globally by logging out and redirecting to login
axios.interceptors.response.use((resp) => resp, (error) => {
  const status = error?.response?.status
  if (status === 401) {
    try {
      store.dispatch(logout())
    } catch (e) {
      // ignore
    }
    // Redirect to login page so user can re-authenticate
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
  return Promise.reject(error)
})

export default axios