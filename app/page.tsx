import Link from 'next/link'
import { FileText, BarChart3, Wrench, ShieldCheck } from 'lucide-react'

export default function Home() {
  return (
    <main className="container animate-fade-in" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.35rem 1rem', 
            borderRadius: 'var(--radius-full)', 
            background: 'var(--primary-light)', 
            color: 'var(--primary-dark)', 
            fontWeight: '600', 
            fontSize: '0.85rem', 
            border: '1px solid rgba(0, 201, 167, 0.2)', 
            marginBottom: '1.5rem' 
          }}
        >
          <ShieldCheck size={16} /> Next.js + Prisma + PostgreSQL
        </div>
        
        <h1 
          className="text-primary" 
          style={{ 
            fontSize: '3rem', 
            lineHeight: '1.15', 
            marginBottom: '1.5rem', 
            fontWeight: 800 
          }}
        >
          Prowider Mini Lead Distribution System
        </h1>
        
        <p className="text-secondary" style={{ fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '680px', margin: '0 auto 3rem' }}>
          A secure, concurrent-safe distribution platform designed to allocate service leads fairly among 8 providers using round-robin queuing, strict quota checks, and transaction locks.
        </p>

        <div className="grid-3 mb-4">
          <div className="card flex-col flex-between">
            <div>
              <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
                <FileText size={32} />
              </div>
              <h3 className="font-bold text-lg mb-1">Submit Leads</h3>
              <p className="text-secondary text-sm mb-2">
                Fill out the customer request form. The system will create the lead and execute the allocation logic. Enforces phone uniqueness per service.
              </p>
            </div>
            <Link href="/request-service" className="btn btn-primary btn-full mt-2">
              Go to Request Form
            </Link>
          </div>

          <div className="card flex-col flex-between">
            <div>
              <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
                <BarChart3 size={32} />
              </div>
              <h3 className="font-bold text-lg mb-1">Live Dashboard</h3>
              <p className="text-secondary text-sm mb-2">
                Monitor providers, remaining quotas, and lead allocations in real-time. Automatically updates to show new leads instantly.
              </p>
            </div>
            <Link href="/dashboard" className="btn btn-primary btn-full mt-2">
              Open Dashboard
            </Link>
          </div>

          <div className="card flex-col flex-between">
            <div>
              <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
                <Wrench size={32} />
              </div>
              <h3 className="font-bold text-lg mb-1">Test Panel</h3>
              <p className="text-secondary text-sm mb-2">
                Simulate payment gateway webhooks with full idempotency checks, trigger 10 concurrent requests to test database locks, and reset data.
              </p>
            </div>
            <Link href="/test-tools" className="btn btn-primary btn-full mt-2">
              Open Test Tools
            </Link>
          </div>
        </div>

        <div 
          className="card text-left" 
          style={{ 
            background: 'var(--card-bg)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-2xl)',
            padding: '2rem'
          }}
        >
          <h4 className="font-bold text-base mb-1">Core System Allocation Rules:</h4>
          <ul className="text-secondary text-sm flex-col gap-1 mt-1" style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
            <li><strong>Service 1 (Movers):</strong> Provider 1 (Mandatory). Pool: Providers 2, 3, 4.</li>
            <li><strong>Service 2 (Packers):</strong> Provider 5 (Mandatory). Pool: Providers 6, 7, 8.</li>
            <li><strong>Service 3 (Storage):</strong> Providers 1 & 4 (Mandatory). Pool: Providers 2, 3, 5, 6, 7, 8.</li>
            <li><strong>Quota Enforcement:</strong> Providers receive a maximum of 10 leads/month. Webhooks can reset this limit.</li>
            <li><strong>Round Robin:</strong> Allocations alternate through pools fairly and states are persisted in the database.</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
