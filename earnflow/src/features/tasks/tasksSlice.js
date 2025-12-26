import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  list: [],
  loading: false,
}

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks(state, action) {
      state.list = action.payload
    },
    completeTask(state, action) {
      state.list = state.list.map(task =>
        task.id === action.payload ? { ...task, completed: true } : task
      )
    },
  },
})

export const { setTasks, completeTask } = tasksSlice.actions
export default tasksSlice.reducer