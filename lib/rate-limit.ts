import { prisma } from '@/lib/prisma';

/**
 * Two-layer rate limiting.
 *
 * • Memory layer  — instant, per serverless instance. Stops bursts.
 * • Postgres layer — shared across instances, so limits can't be bypassed by
 *   hitting a different lambda. The upsert is a single atomic statement.
 *
 * Every sensitive surface (admin actions, reviews, comments, likes, sign-in)
 * calls this with its own bucket key. There is no "skip" flag.
 */

type MemBucket = { count: number; resetAt: number };
const memory = new Map<string, MemBucket>();

export type LimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter: number;
};

const CLEANUP_EVERY = 500;
let calls = 0;

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<LimitResult> {
  const now = Date.now();
  const resetAtMs = now + windowMs;

  // ── layer 1: instance memory ──────────────────────────────────────────
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt < now) {
    memory.set(key, { count: 1, resetAt: resetAtMs });
  } else {
    bucket.count += 1;
    if (bucket.count > limit) {
      return { ok: false, limit, remaining: 0, resetAt: new Date(bucket.resetAt), retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
    }
  }
  if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);

  // ── layer 2: shared Postgres counter ──────────────────────────────────
  try {
    const seconds = Math.max(1, Math.round(windowMs / 1000));
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "cinemood"."RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, now() + make_interval(secs => ${seconds}))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "cinemood"."RateLimit"."resetAt" < now() THEN 1 ELSE "cinemood"."RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "cinemood"."RateLimit"."resetAt" < now() THEN now() + make_interval(secs => ${seconds}) ELSE "cinemood"."RateLimit"."resetAt" END
      RETURNING "count", "resetAt"
    `;
    const row = rows[0];
    if (++calls % CLEANUP_EVERY === 0) {
      prisma.$executeRaw`DELETE FROM "cinemood"."RateLimit" WHERE "resetAt" < now()`.catch(() => null);
    }
    if (!row) return { ok: true, limit, remaining: limit - 1, resetAt: new Date(resetAtMs), retryAfter: 0 };
    const remaining = Math.max(0, limit - Number(row.count));
    const retryAfter = Math.max(0, Math.ceil((new Date(row.resetAt).getTime() - now) / 1000));
    return { ok: Number(row.count) <= limit, limit, remaining, resetAt: new Date(row.resetAt), retryAfter };
  } catch {
    // DB hiccup must not take the site down — memory layer already passed.
    return { ok: true, limit, remaining: limit - 1, resetAt: new Date(resetAtMs), retryAfter: 0 };
  }
}

/** IP for anonymous buckets. Vercel sets x-forwarded-for; we take the first hop. */
export function clientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return h.get('x-real-ip') ?? h.get('cf-connecting-ip') ?? 'unknown';
}

export function tooMany(result: LimitResult, message = 'Bahut zyada requests — thoda ruk ke try karo.') {
  return Response.json(
    { error: message, retryAfter: result.retryAfter },
    { status: 429, headers: { 'Retry-After': String(result.retryAfter), 'Cache-Control': 'no-store' } }
  );
}

/** Buckets used across the app — kept in one place so limits are auditable. */
export const LIMITS = {
  adminPage: { limit: 120, windowMs: 60_000 },
  adminAction: { limit: 60, windowMs: 60_000 },
  adminActionHourly: { limit: 600, windowMs: 60 * 60_000 },
  search: { limit: 90, windowMs: 60_000 },
  signIn: { limit: 30, windowMs: 10 * 60_000 },
  review: { limit: 6, windowMs: 15 * 60_000 },
  comment: { limit: 10, windowMs: 10 * 60_000 },
  like: { limit: 45, windowMs: 60_000 },
  track: { limit: 200, windowMs: 60_000 },
  profile: { limit: 20, windowMs: 10 * 60_000 },
  ghostwrite: { limit: 8, windowMs: 10 * 60_000 },
  jarvis: { limit: 12, windowMs: 60_000 }
} as const;
