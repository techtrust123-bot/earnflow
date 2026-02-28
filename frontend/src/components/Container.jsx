// // src/components/Container.jsx
// import React from 'react'

// const SIZE_MAP = {
//   sm: 'max-w-3xl',
//   md: 'max-w-4xl',
//   lg: 'max-w-5xl',
//   xl: 'max-w-7xl',
//   full: 'max-w-full'
// }

// export default function Container({ children, className = '', size = 'xl' }) {
//   const sizeClass = SIZE_MAP[size] || SIZE_MAP['xl']
//   return (
//     <div className={`w-full ${sizeClass} mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
//       {children}
//     </div>
//   )
// }


// src/components/Container.jsx
import React from 'react'

/**
 * Responsive Container Component
 * 
 * Props:
 * - size: string or object
 *   - string: predefined sizes ('sm', 'md', 'lg', 'xl', 'full')
 *   - object: custom sizes per breakpoint, e.g.
 *     { sm: 'sm:max-w-md', md: 'md:max-w-lg', lg: 'lg:max-w-xl' }
 * - className: additional classes
 */

const SIZE_MAP = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-5xl',
  full: 'max-w-full'
}

export default function Container({ children, className = '', size = 'xl' }) {
  let sizeClass = ''

  if (typeof size === 'string') {
    sizeClass = SIZE_MAP[size] || SIZE_MAP['xl']
  } else if (typeof size === 'object') {
    // Join responsive size classes dynamically
    sizeClass = Object.values(size).join(' ')
  }

  return (
    <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${sizeClass} ${className}`}>
      {children}
    </div>
  )
}

