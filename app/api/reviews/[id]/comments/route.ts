import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

const schema = z.object({ body: z.string().min(2, 'Comment too short').max(600) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid comment' }, { status: 400 });
  }

  const review = await prisma.review.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!review || review.status === 'HIDDEN') {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: { body: parsed.data.body, userId: user.id, reviewId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } }
  });

  return NextResponse.json({ comment });
}
