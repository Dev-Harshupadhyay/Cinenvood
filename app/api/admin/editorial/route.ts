import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, tooMany, LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({
  action: z.enum(['create', 'update', 'delete']),
  id: z.string().optional(),
  titleId: z.string().optional(),
  rating: z.number().int().min(1).max(10).optional(),
  headline: z.string().max(160).optional(),
  body: z.string().max(12000).optional(),
  headlineEn: z.string().max(200).optional(),
  bodyEn: z.string().max(12000).optional(),
  featured: z.boolean().optional(),
  /** 'Jarvis' when an AI draft was published — byline reads "Review by Jarvis" */
  authorName: z.string().max(40).optional()
});

/** Editorial panel — the site's own verdicts, no user account involved. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const gate = await rateLimit(`admin:editorial:${user.id}`, LIMITS.adminAction.limit, LIMITS.adminAction.windowMs);
  if (!gate.ok) return tooMany(gate);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid data' }, { status: 400 });
  const { action, id, titleId, rating, headline, body, headlineEn, bodyEn, featured, authorName } = parsed.data;

  try {
    if (action === 'delete') {
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      await prisma.review.delete({ where: { id } });
      await prisma.adminLog.create({ data: { actor: user.email, action: 'editorial.delete', target: id } });
      return NextResponse.json({ ok: true });
    }

    if (!body || body.trim().length < 20) return NextResponse.json({ error: 'Review body min 20 characters' }, { status: 400 });
    if (!rating) return NextResponse.json({ error: 'Rating required (1-10)' }, { status: 400 });

    const data = {
      rating,
      headline: headline?.trim() || null,
      body: body.trim(),
      headlineEn: headlineEn?.trim() || null,
      bodyEn: bodyEn?.trim() || null,
      editorial: true,
      authorName: (authorName ?? '').trim() || 'CiNEMAsFLiX',
      status: 'PUBLISHED' as const,
      spoiler: false,
      ...(typeof featured === 'boolean' ? { featured } : {})
    };

    if (action === 'update') {
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const review = await prisma.review.update({ where: { id }, data });
      await prisma.adminLog.create({ data: { actor: user.email, action: 'editorial.update', target: id } });
      return NextResponse.json({ review });
    }

    if (!titleId) return NextResponse.json({ error: 'titleId required' }, { status: 400 });
    const existing = await prisma.review.findFirst({ where: { titleId, editorial: true }, select: { id: true } });
    const review = existing
      ? await prisma.review.update({ where: { id: existing.id }, data })
      : await prisma.review.create({ data: { ...data, titleId } });
    await prisma.adminLog.create({ data: { actor: user.email, action: existing ? 'editorial.update' : 'editorial.create', target: review.id } });
    return NextResponse.json({ review });
  } catch (err) {
    console.error('[editorial]', err);
    return NextResponse.json({ error: 'Write failed — check database connection' }, { status: 500 });
  }
}
