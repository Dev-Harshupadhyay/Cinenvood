import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, tooMany, LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({ id: z.string().min(3), on: z.boolean() });

/**
 * Main-page slot.
 *
 * Admin kisi bhi review ko home page ke sabse upar rakh sakta hai — chaahe wo
 * member ka likha hua ho. Purana slot (jaise admin ka khud ka verdict) delete
 * nahi hota: wo `homeSpot = false` ho jaata hai aur film page + /reviews par
 * apni jagah rehta hai. Har swap AdminLog mein record hota hai.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const gate = await rateLimit(`admin:spot:${user.id}`, LIMITS.adminAction.limit, LIMITS.adminAction.windowMs);
  if (!gate.ok) return tooMany(gate);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const { id, on } = parsed.data;

  try {
    const review = await prisma.review.findUnique({
      where: { id },
      select: { id: true, rating: true, titleId: true, editorial: true, authorName: true, title: { select: { title: true } } }
    });
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    if (on) {
      // only one main-page slot at a time
      await prisma.review.updateMany({ where: { homeSpot: true }, data: { homeSpot: false } });
    }
    await prisma.review.update({ where: { id }, data: { homeSpot: on } });

    await prisma.adminLog
      .create({
        data: {
          actor: user.email,
          action: on ? 'review.featureOnHome' : 'review.removeFromHome',
          target: id,
          meta: JSON.stringify({ title: review.title.title, rating: review.rating, editorial: review.editorial })
        }
      })
      .catch(() => null);

    return NextResponse.json({ ok: true, id, homeSpot: on });
  } catch (err) {
    console.error('[feature-review]', err);
    return NextResponse.json({ error: 'Could not update the main-page slot' }, { status: 500 });
  }
}
