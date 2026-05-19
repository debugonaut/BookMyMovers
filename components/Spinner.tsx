import React from 'react'

export default function Spinner({ className = '' }: { className?: string }) {
  return <span className={`spinner ${className}`} />
}
