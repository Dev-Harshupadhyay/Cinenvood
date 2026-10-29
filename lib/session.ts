import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit, LIMITS } from '@/lib/rate-limit';

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  googleImage: string | null;
  role: 'USER' | 'ADMIN';
  bio: string | null;
};

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, name: true, email: true, image: true, googleImage: true, role: true, bio: true }
  });
  return user as CurrentUser | null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');
  return user;
}

async function currentIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
}

/**
 * Admin gate.
 *  1. signed in?
 *  2. role === ADMIN?
 *  3. under the request budget for /admin (120/min per IP+account)?
 * Every branch is explicit — there is no soft "demo" bypass anymore.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');

  const ip = await currentIp();
  const gate = await rateLimit(`admin:page:${ip}:${user.id}`, LIMITS.adminPage.limit, LIMITS.adminPage.windowMs);
  if (!gate.ok) redirect(`/rate-limited?retry=${gate.retryAfter}`);

  if (user.role !== 'ADMIN') {
    const adminEmail = (process.env.ADMIN_EMAIL ?? '').toLowerCase();
    redirect(`/admin-denied?email=${encodeURIComponent(user.email)}&admin=${encodeURIComponent(adminEmail)}`);
  }
  return user;
}
