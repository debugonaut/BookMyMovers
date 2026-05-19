'use client'

import { useState } from 'react'
import { RefreshCw, AlertTriangle, ShieldCheck, Zap, Server, ChevronDown, CheckCircle2 } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────

type WebhookLogEntry = {
  timestamp: string
  providerId: number
  key: string
  duplicate: boolean
  success: boolean
  error?: string
}

type IdempotencyResult = {
  processed: number
  duplicates: number
  errors: number
}

type BulkLeadResult = {
  success: boolean
  leadId?: number
  assignedProviders?: string[]
  error?: string
}

type AllocationDebug = {
  allocationStates: { id: number; serviceId: number; lastAllocatedProviderIndex: number }[]
  providers: { id: number; name: string; leadsReceivedThisMonth: number }[]
} | null

// ─── Helpers ─────────────────────────────────────────────────

function generateUUID(): string {
  return crypto.randomUUID()
}

// ─── Component ───────────────────────────────────────────────

export default function TestToolsPage() {
  const [webhookProviderId, setWebhookProviderId] = useState('1')
  const [idempotencyKey, setIdempotencyKey] = useState(generateUUID())
  const [webhookLoading, setWebhookLoading] = useState(false)
  const [webhookLog, setWebhookLog] = useState<WebhookLogEntry[]>([])

  const [idempotencyLoading, setIdempotencyLoading] = useState(false)
  const [idempotencyResult, setIdempotencyResult] = useState<IdempotencyResult | null>(null)

  const [bulkServiceId, setBulkServiceId] = useState('3')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkLeadResult[] | null>(null)
  const [bulkStats, setBulkStats] = useState<{ total: number; succeeded: number; failed: number } | null>(null)

  const [allocLoading, setAllocLoading] = useState(false)
  const [allocData, setAllocData] = useState<AllocationDebug>(null)
  const [showAlloc, setShowAlloc] = useState(false)

  // ─── Handlers ───────────────────────────────────────────────

  async function loadAllocationState() {
    try {
      const res = await fetch('/api/debug/allocation-state')
      const json = await res.json()
      if (json.success) setAllocData(json.data)
    } catch {
      setAllocData(null)
    }
  }

  async function fireWebhookOnce() {
    setWebhookLoading(true)
    try {
      const res = await fetch('/api/webhook/quota-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          providerId: parseInt(webhookProviderId, 10),
        }),
      })

      const json = await res.json()

      const entry: WebhookLogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        providerId: parseInt(webhookProviderId, 10),
        key: idempotencyKey,
        duplicate: json.data?.duplicate ?? false,
        success: json.success,
        error: json.success ? undefined : json.error,
      }

      setWebhookLog((prev) => [entry, ...prev].slice(0, 5))
      if (showAlloc) {
        await loadAllocationState()
      }
    } catch (err: any) {
      const entry: WebhookLogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        providerId: parseInt(webhookProviderId, 10),
        key: idempotencyKey,
        duplicate: false,
        success: false,
        error: err.message || 'Network failure',
      }
      setWebhookLog((prev) => [entry, ...prev].slice(0, 5))
    } finally {
      setWebhookLoading(false)
    }
  }

  async function fireWebhook5x() {
    setIdempotencyLoading(true)
    setIdempotencyResult(null)

    const pid = parseInt(webhookProviderId, 10)
    const key = idempotencyKey

    try {
      const promises = Array.from({ length: 5 }).map(() =>
        fetch('/api/webhook/quota-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idempotencyKey: key, providerId: pid }),
        }).then((res) => res.json())
      )

      const results = await Promise.all(promises)

      let processed = 0
      let duplicates = 0
      let errors = 0

      for (const r of results) {
        if (!r.success) errors++
        else if (r.data?.duplicate) duplicates++
        else processed++
      }

      setIdempotencyResult({ processed, duplicates, errors })
      if (showAlloc) {
        await loadAllocationState()
      }
    } catch {
      setIdempotencyResult({ processed: 0, duplicates: 0, errors: 5 })
    } finally {
      setIdempotencyLoading(false)
    }
  }

  async function runBulkTest() {
    setBulkLoading(true)
    setBulkResults(null)
    setBulkStats(null)

    try {
      const res = await fetch('/api/test/bulk-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-tool': 'true' },
        body: JSON.stringify({ serviceId: parseInt(bulkServiceId, 10) }),
      })

      const json = await res.json()

      if (json.success && json.data) {
        setBulkStats({ total: json.data.total, succeeded: json.data.succeeded, failed: json.data.failed })
        setBulkResults(json.data.results)
      } else {
        setBulkResults([])
        setBulkStats({ total: 0, succeeded: 0, failed: 0 })
      }
      if (showAlloc) {
        await loadAllocationState()
      }
    } catch {
      setBulkResults([])
      setBulkStats({ total: 0, succeeded: 0, failed: 0 })
    } finally {
      setBulkLoading(false)
    }
  }

  async function fetchAllocationState() {
    if (showAlloc && allocData) {
      setShowAlloc(false)
      return
    }
    
    setAllocLoading(true)
    setShowAlloc(true)
    try {
      await loadAllocationState()
    } finally {
      setAllocLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <main className="container animate-fade-in" style={{ maxWidth: '900px' }}>
      <div className="mb-3">
        <h1 className="text-primary font-bold" style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>Internal Testing Panel</h1>
        <div className="alert alert-warning mb-3">
          <AlertTriangle size={20} />
          <span><strong>Caution:</strong> This panel is for internal testing only. Not for production use.</span>
        </div>
      </div>

      <div className="flex-col gap-2">
        {/* ── Section 1 ── */}
        <div className="card section-card-teal">
          <div className="flex-gap mb-2">
            <RefreshCw size={24} className="text-teal" />
            <h2 className="text-lg font-bold">Quota Reset via Webhook</h2>
          </div>
          <p className="text-secondary text-sm mb-2">
            Simulate a payment gateway confirming a provider&apos;s subscription renewal. Resets their monthly lead counter to 0.
          </p>

          <div className="grid-2 mb-2">
            <div className="form-group mb-0">
              <label className="form-label">Target Provider</label>
              <div style={{ position: 'relative' }}>
                <select className="form-select" style={{ appearance: 'none' }} value={webhookProviderId} onChange={(e) => setWebhookProviderId(e.target.value)} disabled={webhookLoading || idempotencyLoading}>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((id) => <option key={id} value={id}>Provider {id}</option>)}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '0.8rem', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Idempotency Key</label>
              <div className="flex-gap-sm">
                <input type="text" className="form-input" value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} disabled={webhookLoading || idempotencyLoading} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setIdempotencyKey(generateUUID())} disabled={webhookLoading || idempotencyLoading}>New Key</button>
              </div>
            </div>
          </div>

          <button type="button" className="btn btn-primary" onClick={fireWebhookOnce} disabled={webhookLoading || idempotencyLoading}>
            {webhookLoading ? <><span className="spinner" /> Sending...</> : 'Reset Quota'}
          </button>

          <div className="log-container mt-2">
            {webhookLog.length === 0 ? (
              <div className="empty-state">No webhook calls recorded yet.</div>
            ) : (
              webhookLog.map((entry, idx) => (
                <div key={idx} className="log-item flex-between">
                  <div>
                    <span className="font-semibold text-sm">[{entry.timestamp}] Provider {entry.providerId}</span>
                    <div className="text-xs text-secondary mt-1" style={{ fontFamily: 'monospace' }}>Key: {entry.key.slice(0, 20)}...</div>
                    {entry.error && <div className="text-error text-xs mt-1">{entry.error}</div>}
                  </div>
                  <div>
                    {entry.duplicate ? <span className="badge badge-info">DUPLICATE</span> : 
                     entry.success ? <span className="badge badge-success">PROCESSED</span> : 
                     <span className="badge badge-error">FAILED</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Section 2 ── */}
        <div className="card section-card-teal-dark">
          <div className="flex-gap mb-2">
            <ShieldCheck size={24} className="text-teal" />
            <h2 className="text-lg font-bold">Idempotency Verification</h2>
          </div>
          <p className="text-secondary text-sm mb-2">
            Test concurrent webhook deliveries to ensure only the first request is processed and duplicates are safely ignored. Uses the same Provider and Key as above.
          </p>

          <button type="button" className="btn btn-primary" onClick={fireWebhook5x} disabled={webhookLoading || idempotencyLoading}>
            {idempotencyLoading ? <><span className="spinner" /> Firing 5x...</> : 'Fire 5x Simultaneously'}
          </button>

          {idempotencyResult && (
            <div className="alert alert-success mt-2">
              <CheckCircle2 size={20} />
              <div>
                <strong>Idempotency Test Results:</strong> {idempotencyResult.processed} processed, {idempotencyResult.duplicates} duplicates, {idempotencyResult.errors} errors
                {idempotencyResult.processed <= 1 && idempotencyResult.duplicates >= 4 && <div className="mt-1">✅ Idempotency is working correctly!</div>}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3 ── */}
        <div className="card section-card-amber">
          <div className="flex-gap mb-2">
            <Zap size={24} className="text-warning" />
            <h2 className="text-lg font-bold">Concurrency Stress Test</h2>
          </div>
          <p className="text-secondary text-sm mb-2">
            Generate 10 leads simultaneously to stress-test the allocation lock mechanism. Verifies that round-robin advances correctly and no provider gets double-slotted.
          </p>

          <div className="flex-gap flex-wrap mb-2">
            <div className="form-group mb-0" style={{ width: '200px' }}>
              <label className="form-label">Service Type</label>
              <div style={{ position: 'relative' }}>
                <select className="form-select" style={{ appearance: 'none' }} value={bulkServiceId} onChange={(e) => setBulkServiceId(e.target.value)} disabled={bulkLoading}>
                  <option value="1">Service 1</option>
                  <option value="2">Service 2</option>
                  <option value="3">Service 3</option>
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '0.8rem', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="button" className="btn btn-warning" onClick={runBulkTest} disabled={bulkLoading}>
                {bulkLoading ? <><span className="spinner" /> Generating...</> : <><AlertTriangle size={18} /> Generate 10 Leads</>}
              </button>
            </div>
          </div>

          {bulkStats && (
            <div className="mt-3">
              <div className="flex-gap-sm mb-2">
                <span className="badge badge-outline">Total: {bulkStats.total}</span>
                <span className="badge badge-success">Succeeded: {bulkStats.succeeded}</span>
                <span className="badge badge-error">Failed: {bulkStats.failed}</span>
              </div>

              {bulkResults && bulkResults.length > 0 && (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Status</th>
                        <th>Assigned Providers</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResults.map((result, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            {result.success ? <span className="badge badge-success">Success</span> : <span className="badge badge-error">Failed</span>}
                          </td>
                          <td>
                            {result.success && result.assignedProviders ? (
                              <div className="flex-gap-sm flex-wrap">
                                {result.assignedProviders.map((name, i) => <span key={i} className="badge badge-outline">{name}</span>)}
                              </div>
                            ) : '—'}
                          </td>
                          <td>{!result.success ? <span className="text-error text-xs">{result.error}</span> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="divider mt-3 mb-2" />
          
          <button type="button" className="btn btn-outline" onClick={fetchAllocationState} disabled={allocLoading}>
            <Server size={18} /> {showAlloc ? 'Hide Allocation State' : 'Check Allocation State'}
          </button>

          {showAlloc && allocData && (
            <div className="mt-3 animate-fade-in p-3 bg-page rounded-xl border">
              <h4 className="text-sm uppercase font-bold text-secondary mb-1">Pool Index per Service</h4>
              <div className="debug-grid mb-3">
                {allocData.allocationStates.map((state) => (
                  <div key={state.id} className="debug-item">
                    <div className="font-bold text-sm">Service {state.serviceId}</div>
                    <div className="text-teal font-semibold mt-1">Index: {state.lastAllocatedProviderIndex}</div>
                  </div>
                ))}
              </div>

              <h4 className="text-sm uppercase font-bold text-secondary mb-1">Provider Quota Usage</h4>
              <div className="debug-grid">
                {allocData.providers.map((p) => (
                  <div key={p.id} className="debug-item">
                    <div className="font-bold text-sm mb-1">{p.name}</div>
                    <span className={`badge ${p.leadsReceivedThisMonth >= 10 ? 'badge-error' : p.leadsReceivedThisMonth >= 7 ? 'badge-warning' : 'badge-success'}`}>
                      {p.leadsReceivedThisMonth}/10
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
