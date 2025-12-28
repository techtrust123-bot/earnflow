// src/components/Container.jsx
import React from 'react'

const SIZE_MAP = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  full: 'max-w-full'
}

export default function Container({ children, className = '', size = 'xl' }) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP['xl']
  return (
    <div className={`w-full ${sizeClass} mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  )
}
