import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
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
    select: { id: true, name: true, email: true, image: true, role: true, bio: true }
  });
  return user as CurrentUser | null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') redirect('/dashboard?error=forbidden');
  return user;
}
