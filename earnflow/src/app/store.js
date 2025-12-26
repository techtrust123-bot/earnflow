import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import tasksReducer from '../features/tasks/tasksSlice'

 const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
  },
})

export default store