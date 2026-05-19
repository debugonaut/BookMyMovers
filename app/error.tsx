'use client'

import { useEffect } from 'react'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to an external error monitoring service (e.g. Sentry)
    console.error('Unhandled Application Error:', error)
  }, [error])

  return (
    <main className="container flex-col flex-center animate-fade-in" style={{ minHeight: '60vh', textAlign: 'center' }}>
      <div className="card" style={{ maxWidth: '480px', padding: '2.5rem 2rem' }}>
        <div className="flex-center mb-2" style={{ color: 'var(--error)' }}>
          <AlertOctagon size={48} />
        </div>
        <h2 className="text-lg font-bold mb-1">Something went wrong</h2>
        <p className="text-secondary mb-3 text-sm">
          An unexpected error occurred while loading this page. Please try refreshing or return home.
        </p>

        <div className="flex-col gap-1">
          <button
            onClick={() => reset()}
            className="btn btn-primary btn-full"
          >
            <RotateCcw size={16} /> Try Again
          </button>
          
          <Link href="/" className="btn btn-outline btn-full">
            <Home size={16} /> Return to Home
          </Link>
        </div>

        {error.digest && (
          <div className="mt-3 text-xs text-secondary" style={{ fontFamily: 'monospace', opacity: 0.6 }}>
            Error Reference ID: {error.digest}
          </div>
        )}
      </div>
    </main>
  )
}
