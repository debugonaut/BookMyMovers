import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { createLeadWithAssignments } from '@/lib/allocation'

export const submitLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  city: z.string().min(1, 'City is required'),
  serviceId: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  description: z.string().min(10, 'Description must be at least 10 characters'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 1. Validate request body with Zod
    const validationResult = submitLeadSchema.safeParse(body)
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

    const { name, phone, city, serviceId, description } = validationResult.data

    // 2. Check if a lead with same phone + serviceId already exists in DB
    const existingLead = await prisma.lead.findUnique({
      where: {
        phone_service_unique: {
          phone,
          serviceId,
        },
      },
    })

    if (existingLead) {
      return NextResponse.json(
        {
          success: false,
          error: 'A lead with this phone number already exists for this service.',
          code: 'DUPLICATE_LEAD',
        },
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3 & 4. Insert the Lead record & Call assignProviders via lib helper
    // The lib helper createLeadWithAssignments handles both atomically
    const lead = await createLeadWithAssignments({
      customerName: name,
      phone,
      city,
      serviceId,
      description,
    })

    const assignedProviderNames = lead?.assignments.map(a => a.provider.name) || []

    if (assignedProviderNames.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No providers available at this time',
          code: 'NO_PROVIDERS_AVAILABLE'
        },
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 5. Return 201 with the created lead and its assigned provider names
    return NextResponse.json(
      {
        success: true,
        data: {
          lead: {
            id: lead?.id,
            name: lead?.customerName,
            phone: lead?.phone,
            city: lead?.city,
            serviceId: lead?.serviceId,
            description: lead?.description,
          },
          assignedProviders: assignedProviderNames,
        },
      },
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('POST /api/leads error:', error)

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
