import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      orderBy: { id: 'asc' },
      include: {
        assignments: {
          orderBy: { id: 'desc' },
          include: {
            lead: {
              include: {
                service: true,
              },
            },
          },
        },
      },
    })

    const data = providers.map((provider) => {
      const monthlyQuota = 10
      const remainingQuota = Math.max(0, monthlyQuota - provider.leadsReceivedThisMonth)
      
      return {
        id: provider.id,
        name: provider.name,
        monthlyQuota,
        leadsReceivedThisMonth: provider.leadsReceivedThisMonth,
        remainingQuota,
        leads: provider.assignments.map((assignment) => ({
          id: assignment.lead.id.toString(),
          customerName: assignment.lead.customerName,
          city: assignment.lead.city,
          serviceName: assignment.lead.service.name,
          assignedAt: assignment.lead.createdAt.toISOString(),
        })),
      }
    })

    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
