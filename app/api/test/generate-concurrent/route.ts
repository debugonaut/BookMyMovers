import { NextResponse } from 'next/server'
import { createLeadWithAssignments } from '@/lib/allocation'

export async function POST(request: Request) {
  try {
    const { serviceId = 3 } = await request.json().catch(() => ({}))
    const sId = parseInt(serviceId, 10)

    if (isNaN(sId) || sId < 1 || sId > 3) {
      return NextResponse.json(
        { error: 'Invalid serviceId.' },
        { status: 400 }
      )
    }

    // Generate 10 concurrent requests
    const promises = Array.from({ length: 10 }).map((_, index) => {
      // Use unique phone numbers to avoid the unique constraint error
      const uniqueSuffix = Date.now() + '-' + index
      const phone = `9${String(index).padStart(9, '0')}`

      return createLeadWithAssignments({
        customerName: `Concurrent Lead ${index + 1}`,
        phone,
        city: 'Mumbai',
        serviceId: sId,
        description: `Triggered concurrently for testing at ${new Date().toISOString()}`,
      })
        .then((lead) => ({ status: 'fulfilled', lead }))
        .catch((error) => ({ status: 'rejected', error: error.message }))
    })

    const results = await Promise.all(promises)

    return NextResponse.json({ results }, { status: 200 })
  } catch (error: any) {
    console.error('Error generating concurrent leads:', error)
    return NextResponse.json(
      { error: error.message || 'Concurrency test execution failed.' },
      { status: 500 }
    )
  }
}
