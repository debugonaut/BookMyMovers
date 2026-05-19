import React from 'react'

export default function Badge({
  children,
  variant = 'info',
  className = '',
}: {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'outline'
  className?: string
}) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  )
}
