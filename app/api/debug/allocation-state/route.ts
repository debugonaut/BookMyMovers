import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const allocationStates = await prisma.allocationState.findMany({
      orderBy: { serviceId: 'asc' },
      select: {
        id: true,
        serviceId: true,
        lastAllocatedProviderIndex: true,
      },
    })

    const providers = await prisma.provider.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        leadsReceivedThisMonth: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          allocationStates,
          providers,
        },
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('GET /api/debug/allocation-state error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
