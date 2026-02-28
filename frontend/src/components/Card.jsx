import { useTheme } from '../context/ThemeContext'

export default function Card({ children, className = '' }) {
  const { isDark } = useTheme()
  return (
    <div className={`${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'} p-4 rounded-2xl shadow ${className}`}>{children}</div>
  )
}
