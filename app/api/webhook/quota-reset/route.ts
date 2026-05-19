import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

export const quotaResetSchema = z.object({
  idempotencyKey: z.string().uuid('idempotencyKey must be a valid UUID'),
  providerId: z.number().int().min(1).max(8, 'providerId must be between 1 and 8'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 1. Validate request body with Zod
    const validationResult = quotaResetSchema.safeParse(body)
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

    const { idempotencyKey, providerId } = validationResult.data

    // Check if provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    })

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider not found.', code: 'NOT_FOUND' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Check WebhookEvent table for this idempotencyKey
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { idempotencyKey },
    })

    if (existingEvent) {
      return NextResponse.json(
        { success: true, data: { duplicate: true } },
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3. Inside a single transaction
    await prisma.$transaction(async (tx) => {
      // a. Insert the idempotencyKey into WebhookEvent
      await tx.webhookEvent.create({
        data: { idempotencyKey },
      })

      // b. Reset provider's leadsReceivedThisMonth to 0
      await tx.provider.update({
        where: { id: providerId },
        data: { leadsReceivedThisMonth: 0 },
      })
    })

    // 4. Return success
    return NextResponse.json(
      { success: true, data: { duplicate: false, providerId } },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('POST /api/webhook/quota-reset error:', error)
    
    // Check if the unique constraint on WebhookEvent was violated during transaction
    if (error.code === 'P2002') {
        return NextResponse.json(
            { success: true, data: { duplicate: true } },
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    }

    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
