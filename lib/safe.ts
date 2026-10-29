/**
 * Degrade instead of dying.
 *
 * Every page-level data fetch goes through this so a missing table, a rotated
 * password or a paused Supabase project shows a readable banner — never a raw
 * "Application error" screen.
 */
export type Settled<T> = { data: T; error: string | null };

function describe(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/Environment variable not found/i.test(msg)) return 'DATABASE_URL missing on this deployment';
  if (/does not exist/i.test(msg)) return 'Database schema is out of date — run prisma db push';
  if (/P1001|Can't reach database|ECONNREFUSED/i.test(msg)) return 'Database unreachable';
  if (/P2024|pool|timeout/i.test(msg)) return 'Database connection pool timeout';
  if (/self-signed|certificate/i.test(msg)) return 'Database TLS rejected';
  return 'Data layer unavailable';
}

export async function settle<T>(promise: Promise<T>, fallback: T): Promise<Settled<T>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (err) {
    // Never swallow Next.js control-flow signals (dynamic rendering, redirects, 404s).
    const digest = (err as { digest?: string })?.digest;
    if (typeof digest === 'string' && (digest === 'DYNAMIC_SERVER_USAGE' || digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))) {
      throw err;
    }
    console.error('[data]', err instanceof Error ? err.message : err);
    return { data: fallback, error: describe(err) };
  }
}

export async function settleAll(
  promises: Promise<unknown>[],
  fallbacks: unknown[]
): Promise<{ data: any[]; error: string | null }> {
  const results = await Promise.all(promises.map((p, i) => settle(p, fallbacks[i])));
  const error = results.find((r) => r.error)?.error ?? null;
  return { data: results.map((r) => r.data), error };
}
