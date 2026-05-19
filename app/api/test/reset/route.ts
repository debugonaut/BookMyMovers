import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST() {
  try {
    console.log('Resetting database state...')

    // Wrap in a transaction to clean everything up
    await prisma.$transaction([
      // 1. Delete all assignments
      prisma.leadAssignment.deleteMany(),
      // 2. Delete all leads
      prisma.lead.deleteMany(),
      // 3. Reset provider quota usages to 0
      prisma.provider.updateMany({
        data: { leadsReceivedThisMonth: 0 },
      }),
      // 4. Reset allocation states to 0
      prisma.allocationState.updateMany({
        data: { lastAllocatedProviderIndex: 0 },
      }),
      // 5. Delete all webhooks
      prisma.webhookEvent.deleteMany(),
    ])

    return NextResponse.json(
      { message: 'Database reset successful.' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Reset database failed:', error)
    return NextResponse.json(
      { error: error.message || 'Database reset failed.' },
      { status: 500 }
    )
  }
}
