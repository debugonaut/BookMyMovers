import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { idempotencyKey, providerId } = body

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'idempotencyKey is required.' },
        { status: 400 }
      )
    }

    // 1. Check if the webhook event has already been processed (idempotency check)
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { idempotencyKey },
    })

    if (existingEvent) {
      return NextResponse.json(
        {
          message: 'Webhook event already processed (idempotency enforced).',
          duplicate: true,
        },
        { status: 200 }
      )
    }

    // 2. Perform the quota reset inside a transaction
    await prisma.$transaction(async (tx) => {
      // Record the webhook event to prevent future duplicate processing
      await tx.webhookEvent.create({
        data: { idempotencyKey },
      })

      if (providerId && providerId !== 'all') {
        const pId = parseInt(providerId, 10)
        if (isNaN(pId)) {
          throw new Error('Invalid providerId')
        }

        // Reset specific provider quota to 0 (which means remaining is 10)
        await tx.provider.update({
          where: { id: pId },
          data: { leadsReceivedThisMonth: 0 },
        })
      } else {
        // Reset all providers
        await tx.provider.updateMany({
          data: { leadsReceivedThisMonth: 0 },
        })
      }
    })

    return NextResponse.json(
      { message: 'Quota successfully reset.', duplicate: false },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed.' },
      { status: 500 }
    )
  }
}
