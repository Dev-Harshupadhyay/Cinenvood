import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Ek hi client poore app mein (dev mein hot-reload safe).
 * DATABASE_URL missing ho to readable error deta hai, undefined-crash nahi.
 */
function createClient() {
  if (!process.env.DATABASE_URL) {
    // Deploy env check — build fail karne ke bajaye clear message
    console.error(
      '[cinemood] DATABASE_URL missing hai. Vercel → Settings → Environment Variables mein ' +
        'DATABASE_URL (pooled 6543, ?schema=cinemood&pgbouncer=true&connection_limit=10&sslmode=require) add karo, phir Redeploy.'
    );
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    datasources: process.env.DATABASE_URL ? undefined : { db: { url: 'postgresql://invalid:invalid@127.0.0.1:1/none' } }
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
