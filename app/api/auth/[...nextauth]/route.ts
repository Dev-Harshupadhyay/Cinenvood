import { handlers } from '@/auth';
import { rateLimit, tooMany, clientIp, LIMITS } from '@/lib/rate-limit';

export const GET = handlers.GET;

/**
 * Sign-in traffic is limited per IP before Auth.js ever sees it:
 * 30 attempts / 10 minutes. Callback spam and credential probing both stop here.
 */
export async function POST(req: Request & { nextUrl?: unknown }) {
  const gate = await rateLimit(`auth:${clientIp(req)}`, LIMITS.signIn.limit, LIMITS.signIn.windowMs);
  if (!gate.ok) return tooMany(gate, 'Bahut zyada sign-in attempts — 10 minute baad try karo.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return handlers.POST(req as any);
}
