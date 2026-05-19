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

    const formattedProviders = providers.map((provider) => {
      const remainingQuota = Math.max(0, 10 - provider.leadsReceivedThisMonth)
      return {
        id: provider.id,
        name: provider.name,
        leadsReceivedThisMonth: provider.leadsReceivedThisMonth,
        remainingQuota,
        assignedLeads: provider.assignments.map((assignment) => ({
          assignmentId: assignment.id,
          leadId: assignment.lead.id,
          customerName: assignment.lead.customerName,
          phone: assignment.lead.phone,
          city: assignment.lead.city,
          serviceId: assignment.lead.serviceId,
          serviceName: assignment.lead.service.name,
          description: assignment.lead.description,
          createdAt: assignment.lead.createdAt,
        })),
      }
    })

    return NextResponse.json(formattedProviders, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching providers:', error)
    return NextResponse.json(
      { error: 'An error occurred while fetching providers.' },
      { status: 500 }
    )
  }
}
