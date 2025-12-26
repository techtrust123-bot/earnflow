import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  token: null,
  balance: 0,
  userType: 'user',        // ← default role
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action) {
      state.user = action.payload.user
      state.token = action.payload.token
      state.balance = action.payload.balance || 0
      state.userType = action.payload.user?.userType || 'user'  // ← safe
      state.isAuthenticated = true
    },
    logout(state) {
      // Reset to initial state
      return initialState
    },
    updateBalance(state, action) {
      state.balance = action.payload
    },
  },
})

export const { loginSuccess, logout, updateBalance } = authSlice.actions
export default authSlice.reducer