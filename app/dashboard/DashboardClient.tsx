'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, Activity, Users, Target, Inbox } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────

type DashboardLead = {
  id: string
  customerName: string
  city: string
  serviceName: string
  assignedAt: string
}

type DashboardProvider = {
  id: number
  name: string
  monthlyQuota: number
  leadsReceivedThisMonth: number
  remainingQuota: number
  leads: DashboardLead[]
}

type Props = {
  initialData: DashboardProvider[]
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function quotaStatusClass(remaining: number): 'success' | 'warning' | 'error' {
  if (remaining === 0) return 'error'
  if (remaining <= 3) return 'warning'
  return 'success'
}

// ─── Component ───────────────────────────────────────────────

export default function DashboardClient({ initialData }: Props) {
  const [providers, setProviders] = useState<DashboardProvider[]>(initialData)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)
  const [expandedProviders, setExpandedProviders] = useState<Set<number>>(new Set())
  const [showToast, setShowToast] = useState(false)

  const failureRef = useRef(0)
  const previousUpdateRef = useRef(new Date().getTime())

  // Polling logic
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.success && json.data) {
        // Compare data payload size as a rudimentary way to trigger toast without deep equal
        const newDataStr = JSON.stringify(json.data)
        const oldDataStr = JSON.stringify(providers)
        
        if (newDataStr !== oldDataStr) {
          setShowToast(true)
          setTimeout(() => setShowToast(false), 3000)
        }

        setProviders(json.data)
        const now = new Date()
        setLastUpdated(now)
        previousUpdateRef.current = now.getTime()
        failureRef.current = 0
        setConsecutiveFailures(0)
      }
    } catch {
      failureRef.current += 1
      setConsecutiveFailures(failureRef.current)
    }
  }, [providers])

  // Poll every 5 seconds
  useEffect(() => {
    const pollInterval = setInterval(fetchDashboard, 5000)
    return () => clearInterval(pollInterval)
  }, [fetchDashboard])

  // Update seconds counter
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - previousUpdateRef.current) / 1000))
    }, 1000)
    return () => clearInterval(tickInterval)
  }, [lastUpdated])

  // Metrics
  const uniqueLeadIds = new Set<string>()
  providers.forEach((p) => p.leads.forEach((l) => uniqueLeadIds.add(l.id)))
  const totalLeads = uniqueLeadIds.size

  const providersAtFullQuota = providers.filter((p) => p.remainingQuota === 0).length

  function toggleProvider(id: number) {
    setExpandedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <main className="animate-fade-in">
      {/* ── Hero Bar ── */}
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '0' }}>
        <div className="flex-between flex-wrap gap-2">
          <div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.25rem' }}>Provider Dashboard</h1>
            <p className="text-secondary">Real-time view of lead allocation across all providers.</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="flex-gap-sm justify-end text-sm font-semibold">
              <span className="live-dot" /> Live • Auto-updating every 5s
            </div>
            <div className="text-xs text-secondary mt-1">
              Last updated {secondsAgo} seconds ago
            </div>
          </div>
        </div>

        {consecutiveFailures >= 3 && (
          <div className="alert alert-warning mt-2">
            <Activity size={18} />
            <span>Connection issue — retrying to sync with server.</span>
          </div>
        )}

        <div className="divider" style={{ margin: '2rem 0' }} />
      </div>

      <div className="container" style={{ paddingTop: '0' }}>
        {/* ── Summary Stats ── */}
        <div className="grid-3 mb-3">
          <div className="stat-card">
            <Users size={20} className="text-teal mb-1" />
            <div className="stat-card-value">{providers.length}</div>
            <div className="stat-card-label">Total Providers</div>
          </div>
          <div className="stat-card">
            <Target size={20} className="text-teal mb-1" />
            <div className="stat-card-value" style={{ color: providersAtFullQuota > 0 ? 'var(--error)' : 'inherit' }}>
              {providersAtFullQuota}
            </div>
            <div className="stat-card-label">Providers at Full Quota</div>
          </div>
          <div className="stat-card">
            <Inbox size={20} className="text-teal mb-1" />
            <div className="stat-card-value">{totalLeads}</div>
            <div className="stat-card-label">Total Leads This Month</div>
          </div>
        </div>

        {/* ── Provider Grid ── */}
        <div className="grid-auto">
          {providers.map((provider) => {
            const isExpanded = expandedProviders.has(provider.id)
            const status = quotaStatusClass(provider.remainingQuota)
            const fillPercent = (provider.leadsReceivedThisMonth / provider.monthlyQuota) * 100

            return (
              <div key={provider.id} className="card">
                <div className="flex-between mb-2">
                  <h3 className="font-bold text-lg">{provider.name}</h3>
                  <span className={`badge badge-${status}`}>
                    {provider.remainingQuota === 0 ? 'Full' : `${provider.remainingQuota} left`}
                  </span>
                </div>

                <div className="mb-2">
                  <div className="flex-between text-xs font-semibold mb-1 uppercase">
                    <span className="text-secondary">Quota Usage</span>
                    <span>{provider.leadsReceivedThisMonth} / {provider.monthlyQuota}</span>
                  </div>
                  <div className="progress-bar-track">
                    <div 
                      className={`progress-bar-fill ${status === 'error' ? 'error' : status === 'warning' ? 'warning' : ''}`}
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                </div>

                <div className="text-sm font-semibold mb-2">
                  <span className="text-teal">{provider.leads.length}</span> leads received
                </div>

                <div className="divider" style={{ margin: '1rem 0 0.5rem' }} />

                {provider.leads.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleProvider(provider.id)}
                      className="flex-between text-sm font-semibold text-secondary"
                      style={{ width: '100%', padding: '0.5rem 0', cursor: 'pointer', background: 'none', border: 'none' }}
                    >
                      <span>{isExpanded ? 'Hide' : 'Show'} assigned leads</span>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {isExpanded && (
                      <div className="leads-scroll">
                        {provider.leads.map((lead) => (
                          <div key={lead.id} className="lead-row">
                            <div>
                              <div className="lead-name">{lead.customerName}</div>
                              <div className="lead-city">{lead.city}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span className="service-pill">{lead.serviceName}</span>
                              <div className="lead-time">{formatDate(lead.assignedAt)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-state">
                    <Inbox size={24} className="text-secondary" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                    <p>No leads assigned yet</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="toast-container">
          <div className="toast">
            <CheckCircle2 size={18} className="text-teal" />
            <span>Dashboard updated with new data</span>
          </div>
        </div>
      )}
    </main>
  )
}
