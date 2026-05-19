'use client'

import React, { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function Toast({
  message,
  onClose,
  duration = 3000,
}: {
  message: string
  onClose: () => void
  duration?: number
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  return (
    <div className="toast-container">
      <div className="toast">
        <CheckCircle2 size={18} className="text-teal" />
        <span>{message}</span>
      </div>
    </div>
  )
}
