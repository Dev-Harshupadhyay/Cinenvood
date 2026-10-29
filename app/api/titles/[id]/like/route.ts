import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, tooMany, LIMITS } from '@/lib/rate-limit';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const gate = await rateLimit(`tlike:${user.id}`, LIMITS.like.limit, LIMITS.like.windowMs);
  if (!gate.ok) return tooMany(gate);

  const { id } = await params;
  const { kind } = (await req.json().catch(() => ({}))) as { kind?: string };
  const k = kind === 'WATCHLIST' ? 'WATCHLIST' : 'LIKE';

  const existing = await prisma.titleLike.findUnique({
    where: { userId_titleId_kind: { userId: user.id, titleId: id, kind: k } }
  });

  if (existing) {
    await prisma.titleLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.titleLike.create({ data: { userId: user.id, titleId: id, kind: k } }).catch(() => {});
  }

  const count = await prisma.titleLike.count({ where: { titleId: id, kind: k } });
  return NextResponse.json({ active: !existing, count });
}
