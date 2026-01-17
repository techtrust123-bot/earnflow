import React from 'react'
import { useTheme } from '../context/ThemeContext'

function AddTasks() {
  const { isDark } = useTheme()
  
  return (
    <div className={`min-h-screen p-6 transition-colors ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className={`max-w-2xl mx-auto p-6 rounded-lg transition-colors ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
        <h2 className={`text-2xl font-bold transition-colors ${isDark ? 'text-slate-50' : 'text-gray-900'}`}>Add Tasks</h2>
        <p className={`mt-2 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Task management coming soon...</p>
      </div>
    </div>
  )
}

export default AddTasks