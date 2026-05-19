import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createLeadWithAssignments } from '@/lib/allocation'

export const bulkLeadsSchema = z.object({
  serviceId: z.union([z.literal(1), z.literal(2), z.literal(3)]),
})

export async function POST(request: Request) {
  try {
    // Check for guard header
    const testHeader = request.headers.get('x-test-tool')
    if (testHeader !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized request.', code: 'UNAUTHORIZED' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = bulkLeadsSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues.map(e => e.message).join(', '),
          code: 'VALIDATION_ERROR',
        },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { serviceId } = validationResult.data

    // 1. Generate 10 fake leads
    const fakeLeads = Array.from({ length: 10 }).map((_, index) => {
      const timestamp = Date.now().toString()
      // Generate a unique 10 digit phone number (e.g. 999xxxxxxx)
      const randomSuffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
      const uniquePhone = `999${randomSuffix}`

      return {
        customerName: `Bulk Lead ${timestamp.slice(-4)}-${index + 1}`,
        phone: uniquePhone,
        city: 'Metropolis',
        serviceId: serviceId,
        description: `Bulk generated lead for concurrency testing.`,
      }
    })

    // 2. Use Promise.all() to submit all 10 simultaneously
    const promises = fakeLeads.map((leadData) => 
      createLeadWithAssignments(leadData)
        .then((lead) => ({
          status: 'fulfilled',
          lead,
        }))
        .catch((error) => ({
          status: 'rejected',
          error: error.message || 'Failed to allocate',
        }))
    )

    const outcomes = await Promise.all(promises)

    // 3. Collect results
    let succeeded = 0
    let failed = 0
    const results = outcomes.map((outcome: any) => {
      if (outcome.status === 'fulfilled') {
        succeeded++
        return {
          success: true,
          leadId: outcome.lead?.id,
          assignedProviders: outcome.lead?.assignments.map((a: any) => a.provider.name) || []
        }
      } else {
        failed++
        return {
          success: false,
          error: outcome.error
        }
      }
    })

    // 4. Return 200 with stats
    return NextResponse.json(
      {
        success: true,
        data: {
          total: 10,
          succeeded,
          failed,
          results,
        },
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('POST /api/test/bulk-leads error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
