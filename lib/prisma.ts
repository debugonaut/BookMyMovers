import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL
  const isExternal = connectionString?.includes('supabase.com') || connectionString?.includes('pooler.supabase.com')
  const pool = new Pool({ 
    connectionString,
    ssl: isExternal ? { rejectUnauthorized: false } : undefined,
    max: 4, // Limit local pool size to prevent exceeding Supabase's max pool size of 15
    connectionTimeoutMillis: 10000, // 10s to acquire connection from pool
    idleTimeoutMillis: 10000, // 10s idle connection timeout
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
