import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding data...')

  // 1. Create Services
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 1 },
      update: { name: 'Service 1' },
      create: { id: 1, name: 'Service 1' },
    }),
    prisma.service.upsert({
      where: { id: 2 },
      update: { name: 'Service 2' },
      create: { id: 2, name: 'Service 2' },
    }),
    prisma.service.upsert({
      where: { id: 3 },
      update: { name: 'Service 3' },
      create: { id: 3, name: 'Service 3' },
    }),
  ])
  console.log('Services seeded')

  // 2. Create Providers (1 through 8)
  const providerPromises = []
  for (let i = 1; i <= 8; i++) {
    providerPromises.push(
      prisma.provider.upsert({
        where: { id: i },
        update: { name: `Provider ${i}` },
        create: { id: i, name: `Provider ${i}` },
      })
    )
  }
  await Promise.all(providerPromises)
  console.log('Providers seeded')

  // 3. Setup Initial Allocation States for each service
  const allocationStates = await Promise.all([
    prisma.allocationState.upsert({
      where: { serviceId: 1 },
      update: {},
      create: { serviceId: 1, lastAllocatedProviderIndex: 0 },
    }),
    prisma.allocationState.upsert({
      where: { serviceId: 2 },
      update: {},
      create: { serviceId: 2, lastAllocatedProviderIndex: 0 },
    }),
    prisma.allocationState.upsert({
      where: { serviceId: 3 },
      update: {},
      create: { serviceId: 3, lastAllocatedProviderIndex: 0 },
    }),
  ])
  console.log('Allocation States seeded')

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
