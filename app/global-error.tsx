'use client'

import { AlertOctagon, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#F4F6FB',
        color: '#1A1A2E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}>
          <div style={{ color: '#E53E3E', marginBottom: '1rem' }}>
            <AlertOctagon size={48} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Critical Error</h2>
          <p style={{ color: '#5A6A85', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
            A critical system error occurred. The application is temporarily unavailable.
          </p>
          <button
            onClick={() => reset()}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '9999px',
              background: '#00C9A7',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <RotateCcw size={16} /> Attempt Recovery
          </button>
        </div>
      </body>
    </html>
  )
}
