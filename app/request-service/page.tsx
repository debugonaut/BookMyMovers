'use client'

import { useState, FormEvent } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, MapPin, Zap, Star, Clock } from 'lucide-react'

type FieldErrors = {
  name?: string
  phone?: string
  city?: string
  serviceId?: string
  description?: string
}

export default function RequestServicePage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [description, setDescription] = useState('')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [successData, setSuccessData] = useState<string[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = 'Name is required'
    if (!phone.trim()) errors.phone = 'Phone number is required'
    else if (!/^\\d{10}$/.test(phone.trim())) errors.phone = 'Phone must be exactly 10 digits'
    if (!city.trim()) errors.city = 'City is required'
    if (!serviceId) errors.serviceId = 'Please select a service'
    if (!description.trim()) errors.description = 'Description is required'
    else if (description.trim().length < 10) errors.description = 'Description must be at least 10 characters'
    return errors
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          serviceId: parseInt(serviceId, 10),
          description: description.trim(),
        }),
      })

      const data = await response.json()

      if (response.status === 201 && data.success) {
        setSuccessData(data.data.assignedProviders)
      } else if (data.code === 'DUPLICATE_LEAD') {
        setErrorMessage('You have already submitted a request for this service.')
      } else if (data.code === 'NO_PROVIDERS_AVAILABLE') {
        setErrorMessage('No providers are currently available for this service. Please try again later.')
      } else {
        setErrorMessage(data.error || 'An unexpected error occurred. Please try again.')
      }
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setName('')
    setPhone('')
    setCity('')
    setServiceId('')
    setDescription('')
    setFieldErrors({})
    setSuccessData(null)
    setErrorMessage(null)
  }

  return (
    <main className="animate-fade-in">
      {/* ── Hero Section ── */}
      <section className="hero">
        <div className="container hero-split">
          <div>
            <div className="hero-label">Trusted Service Platform</div>
            <h1 className="hero-heading" style={{ color: 'var(--text-primary)' }}>Find the Best Service Providers in Your City</h1>
            <p className="hero-sub" style={{ color: 'var(--text-secondary)' }}>
              Submit your enquiry and get connected with top-rated professionals instantly.
            </p>
          </div>
          <div className="flex-center hero-illustration">
            {/* Minimal SVG Illustration with teal & yellow accents */}
            <svg width="280" height="280" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 180L180 180" stroke="#1A1A2E" strokeWidth="4" strokeLinecap="round"/>
              <rect x="40" y="80" width="120" height="100" rx="8" fill="#00C9A7" stroke="#1A1A2E" strokeWidth="4"/>
              <rect x="60" y="100" width="80" height="40" fill="#FCD34D" stroke="#1A1A2E" strokeWidth="4"/>
              <circle cx="70" cy="180" r="16" fill="#FFFFFF" stroke="#1A1A2E" strokeWidth="4"/>
              <circle cx="130" cy="180" r="16" fill="#FFFFFF" stroke="#1A1A2E" strokeWidth="4"/>
              <path d="M120 80L140 40H180V80" fill="#E6FAF7" stroke="#1A1A2E" strokeWidth="4" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </section>

      {/* ── Form Section ── */}
      <section className="container" style={{ marginTop: '-4rem', position: 'relative', zIndex: 10 }}>
        <div className="card" style={{ maxWidth: '640px', margin: '0 auto', background: 'var(--white)' }}>
          {successData ? (
            <div className="empty-state">
              <CheckCircle2 size={64} className="text-teal" style={{ margin: '0 auto 1rem' }} />
              <h2 className="text-lg font-bold mb-1 text-primary">Request Submitted Successfully!</h2>
              <p className="text-secondary mb-2">We have assigned the following providers to your request:</p>
              
              <div className="flex-col gap-1 mb-3" style={{ alignItems: 'center' }}>
                {successData.map(p => (
                  <div key={p} className="badge badge-info flex-gap-sm" style={{ padding: '0.5rem 1rem' }}>
                    <MapPin size={14} /> {p}
                  </div>
                ))}
              </div>
              
              <button onClick={resetForm} className="btn btn-outline btn-full">
                Submit Another Request
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '0.25rem' }}>
                <h2 className="font-bold text-lg text-primary">Submit Your Enquiry</h2>
              </div>

              {errorMessage && (
                <div className="alert alert-error mb-2">
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Full Name</label>
                    <input
                      id="name" type="text"
                      className={`form-input ${fieldErrors.name ? 'form-input-error' : ''}`}
                      placeholder="e.g. John Doe"
                      value={name} onChange={e => setName(e.target.value)} disabled={submitting}
                    />
                    {fieldErrors.name && <div className="form-error"><AlertCircle size={14}/>{fieldErrors.name}</div>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">Phone Number</label>
                    <input
                      id="phone" type="text" maxLength={10}
                      className={`form-input ${fieldErrors.phone ? 'form-input-error' : ''}`}
                      placeholder="e.g. 9876543210"
                      value={phone} onChange={e => setPhone(e.target.value.replace(/\\D/g, '').slice(0, 10))} disabled={submitting}
                    />
                    {fieldErrors.phone && <div className="form-error"><AlertCircle size={14}/>{fieldErrors.phone}</div>}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="city" className="form-label">City</label>
                    <input
                      id="city" type="text"
                      className={`form-input ${fieldErrors.city ? 'form-input-error' : ''}`}
                      placeholder="e.g. Mumbai"
                      value={city} onChange={e => setCity(e.target.value)} disabled={submitting}
                    />
                    {fieldErrors.city && <div className="form-error"><AlertCircle size={14}/>{fieldErrors.city}</div>}
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label htmlFor="serviceId" className="form-label">Service Type</label>
                    <select
                      id="serviceId"
                      className={`form-select ${fieldErrors.serviceId ? 'form-input-error' : ''}`}
                      style={{ appearance: 'none' }}
                      value={serviceId} onChange={e => setServiceId(e.target.value)} disabled={submitting}
                    >
                      <option value="">— Select a service —</option>
                      <option value="1">Service 1</option>
                      <option value="2">Service 2</option>
                      <option value="3">Service 3</option>
                    </select>
                    <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '2.4rem', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                    {fieldErrors.serviceId && <div className="form-error"><AlertCircle size={14}/>{fieldErrors.serviceId}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="description" className="form-label">Requirement Details <span className="text-xs" style={{ textTransform: 'none', fontWeight: 400 }}>(min 10 characters)</span></label>
                  <textarea
                    id="description" rows={4}
                    className={`form-textarea ${fieldErrors.description ? 'form-input-error' : ''}`}
                    placeholder="Describe your requirements..."
                    value={description} onChange={e => setDescription(e.target.value)} disabled={submitting}
                  />
                  {fieldErrors.description && <div className="form-error"><AlertCircle size={14}/>{fieldErrors.description}</div>}
                </div>

                <button type="submit" className="btn btn-primary btn-full mt-1" disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Submitting...</> : 'Book Now'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ── Features Strip ── */}
      <section className="features-strip">
        <div className="features-strip-grid">
          <div>
            <div className="feature-item-icon"><Zap size={24} /></div>
            <h3 className="font-bold mb-1">Fast Assignment</h3>
            <p className="text-sm" style={{ opacity: 0.85 }}>Instant routing to available partners.</p>
          </div>
          <div>
            <div className="feature-item-icon"><Star size={24} /></div>
            <h3 className="font-bold mb-1">Top Providers</h3>
            <p className="text-sm" style={{ opacity: 0.85 }}>Connect with verified professionals.</p>
          </div>
          <div>
            <div className="feature-item-icon"><Clock size={24} /></div>
            <h3 className="font-bold mb-1">Real-time Updates</h3>
            <p className="text-sm" style={{ opacity: 0.85 }}>Track your lead allocation instantly.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
