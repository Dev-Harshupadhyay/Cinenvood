import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, tooMany, LIMITS } from '@/lib/rate-limit';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const gate = await rateLimit(`like:${user.id}`, LIMITS.like.limit, LIMITS.like.windowMs);
  if (!gate.ok) return tooMany(gate);

  const { id } = await params;

  const existing = await prisma.reviewLike.findUnique({
    where: { userId_reviewId: { userId: user.id, reviewId: id } }
  });

  if (existing) {
    await prisma.reviewLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.reviewLike.create({ data: { userId: user.id, reviewId: id } }).catch(() => {});
  }

  const count = await prisma.reviewLike.count({ where: { reviewId: id } });
  return NextResponse.json({ liked: !existing, count });
}
