import prisma from './prisma'
import { Prisma } from '@prisma/client'

const MONTHLY_QUOTA = 10

type ServiceConfig = {
  mandatoryProviders: number[]
  poolProviders: number[]
}

const SERVICE_CONFIGS: Record<number, ServiceConfig> = {
  1: {
    mandatoryProviders: [1],
    poolProviders: [2, 3, 4],
  },
  2: {
    mandatoryProviders: [5],
    poolProviders: [6, 7, 8],
  },
  3: {
    mandatoryProviders: [1, 4],
    poolProviders: [2, 3, 5, 6, 7, 8],
  },
}

/**
 * Creates a Lead and assigns exactly 3 providers atomically in a transaction.
 * Uses SELECT FOR UPDATE on the service's AllocationState to serialize assignments
 * and prevent race conditions (concurrency safety).
 */
export async function createLeadWithAssignments(data: {
  customerName: string
  phone: string
  city: string
  serviceId: number
  description?: string
}) {
  const config = SERVICE_CONFIGS[data.serviceId]
  if (!config) {
    throw new Error(`Invalid service ID: ${data.serviceId}`)
  }

  return await prisma.$transaction(
    async (tx) => {
      // 1. Create the lead first (enforces unique [phone, serviceId] at DB level)
      const lead = await tx.lead.create({
        data: {
          customerName: data.customerName,
          phone: data.phone,
          city: data.city,
          serviceId: data.serviceId,
          description: data.description,
        },
      })

      // 2. Fetch current allocation state with an exclusive lock
      const state = await tx.$queryRaw<
        { id: number; lastAllocatedProviderIndex: number }[]
      >(
        Prisma.sql`
          SELECT id, "lastAllocatedProviderIndex" 
          FROM "AllocationState" 
          WHERE "serviceId" = ${data.serviceId} 
          FOR UPDATE
        `
      )

      if (!state.length) {
        throw new Error(`Allocation state missing for service ${data.serviceId}`)
      }

      const { lastAllocatedProviderIndex } = state[0]
      let currentIndex = lastAllocatedProviderIndex

      // 3. Fetch all potential providers for this service with their current quota usage
      // We use row-level locks (FOR UPDATE) sorted by ID to prevent deadlocks and ensure
      // cross-service concurrency doesn't cause a provider to exceed their quota.
      const providerIds = [...config.mandatoryProviders, ...config.poolProviders]
      const providers = await tx.$queryRaw<
        { id: number; name: string; leadsReceivedThisMonth: number }[]
      >(
        Prisma.sql`
          SELECT id, name, "leadsReceivedThisMonth" 
          FROM "Provider" 
          WHERE id IN (${Prisma.join(providerIds)}) 
          ORDER BY id 
          FOR UPDATE
        `
      )

      const providerMap = new Map(providers.map((p) => [p.id, p]))
      const selectedProviders: number[] = []

      // 4. Select mandatory providers (if they have quota available)
      for (const pId of config.mandatoryProviders) {
        const provider = providerMap.get(pId)
        if (provider && provider.leadsReceivedThisMonth < MONTHLY_QUOTA) {
          selectedProviders.push(pId)
        }
      }

      // 5. Calculate how many more providers we need from the pool to reach exactly 3
      const neededFromPool = Math.max(0, 3 - selectedProviders.length)
      const pool = config.poolProviders
      let poolAttempts = 0
      const maxAttempts = pool.length
      let selectedFromPool = 0

      // Rotate pool in round-robin fashion
      while (selectedFromPool < neededFromPool && poolAttempts < maxAttempts) {
        currentIndex = (currentIndex + 1) % pool.length
        const candidateId = pool[currentIndex]
        const provider = providerMap.get(candidateId)

        if (provider && provider.leadsReceivedThisMonth < MONTHLY_QUOTA) {
          if (!selectedProviders.includes(candidateId)) {
            selectedProviders.push(candidateId)
            selectedFromPool++
          }
        }
        poolAttempts++
      }

      // If we cannot fulfill the exact 3 provider requirement, roll back the transaction
      if (selectedProviders.length !== 3) {
        throw new Error('NOT_ENOUGH_PROVIDERS')
      }

      // 6. If we have selected providers, assign them and increment their quota counts
      if (selectedProviders.length > 0) {
        const assignmentsData = selectedProviders.map((pId) => ({
          leadId: lead.id,
          providerId: pId,
        }))
        await tx.leadAssignment.createMany({ data: assignmentsData })

        // Increment the quota counts for the selected providers
        await tx.provider.updateMany({
          where: { id: { in: selectedProviders } },
          data: {
            leadsReceivedThisMonth: { increment: 1 },
          },
        })
      }

      // 7. Update round-robin state
      await tx.allocationState.update({
        where: { serviceId: data.serviceId },
        data: { lastAllocatedProviderIndex: currentIndex },
      })

      // Return lead with assignments populated
      return tx.lead.findUnique({
        where: { id: lead.id },
        include: {
          assignments: {
            include: {
              provider: true,
            },
          },
        },
      })
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 20000,
      maxWait: 20000,
    }
  )
}
