import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

/**
 * Ek hi client poore app mein (dev mein hot-reload safe).
 *
 * Do production-hardening cheezein:
 *  1. DATABASE_URL missing ho to readable error, undefined-crash nahi.
 *  2. `PgBouncer`/Supabase pooler kabhi-kabhi idle connections reset karta hai
 *     ("Connection reset by peer"). Ek chhota retry us transient blip ko
 *     user ke liye invisible bana deta hai.
 */
function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /connection reset|ECONNRESET|EPIPE|P1001|P1017|Can't reach database|Timed out fetching a new connection|closed the connection/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createClient() {
  if (!process.env.DATABASE_URL) {
    console.error(
      '[cinemood] DATABASE_URL missing hai. Vercel → Settings → Environment Variables mein ' +
        'DATABASE_URL (pooled 6543, ?schema=cinemood&pgbouncer=true&connection_limit=10&sslmode=require) add karo, phir Redeploy.'
    );
  }

  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    datasources: process.env.DATABASE_URL ? undefined : { db: { url: 'postgresql://invalid:invalid@127.0.0.1:1/none' } }
  });

  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (err) {
          if (!isTransient(err)) throw err;
          await sleep(140);
          try {
            return await query(args);
          } catch (retryErr) {
            if (!isTransient(retryErr)) throw retryErr;
            await sleep(320);
            return query(args);
          }
        }
      }
    }
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
