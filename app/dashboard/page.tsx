import prisma from '@/lib/prisma'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let initialData: any[] = []

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

    initialData = providers.map((provider) => {
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
  } catch (error) {
    console.error('Dashboard SSR fetch error:', error)
    // Will render with empty data, client polling will hydrate
  }

  return <DashboardClient initialData={initialData} />
}
