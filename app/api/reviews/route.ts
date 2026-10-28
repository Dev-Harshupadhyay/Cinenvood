import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

const schema = z.object({
  titleId: z.string().min(1),
  rating: z.number().int().min(1).max(10),
  headline: z.string().max(90).optional().default(''),
  body: z.string().min(20, 'Review thoda lamba likho (min 20 characters)').max(4000),
  spoiler: z.boolean().optional().default(false)
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid data' }, { status: 400 });
  }
  const { titleId, rating, headline, body, spoiler } = parsed.data;

  const title = await prisma.title.findUnique({ where: { id: titleId } });
  if (!title) return NextResponse.json({ error: 'Title not found' }, { status: 404 });

  const review = await prisma.review.upsert({
    where: { userId_titleId: { userId: user.id, titleId } },
    update: { rating, headline, body, spoiler },
    create: { userId: user.id, titleId, rating, headline, body, spoiler }
  });

  return NextResponse.json({ review });
}
