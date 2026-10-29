import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { fetchOmdb } from '@/lib/omdb';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, tooMany, LIMITS } from '@/lib/rate-limit';

const schema = z.object({
  action: z.enum([
    'review.status',
    'review.delete',
    'review.feature',
    'title.feature',
    'title.status',
    'title.enrich',
    'user.role',
    'user.delete',
    'comment.delete'
  ]),
  id: z.string().min(1),
  value: z.string().optional()
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  // Two windows: burst + hourly. Both must pass, no bypass path.
  const burst = await rateLimit(`admin:act:${user.id}`, LIMITS.adminAction.limit, LIMITS.adminAction.windowMs);
  if (!burst.ok) return tooMany(burst, `Admin action limit — ${burst.retryAfter}s baad try karo.`);
  const hourly = await rateLimit(`admin:hour:${user.id}`, LIMITS.adminActionHourly.limit, LIMITS.adminActionHourly.windowMs);
  if (!hourly.ok) return tooMany(hourly, 'Hourly admin limit khatam. Thodi der baad try karo.');

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  const { action, id, value } = parsed.data;

  switch (action) {
    case 'review.status': {
      const status = value === 'PENDING' ? 'PENDING' : value === 'HIDDEN' ? 'HIDDEN' : 'PUBLISHED';
      await prisma.review.update({ where: { id }, data: { status } });
      break;
    }
    case 'review.feature':
      await prisma.review.update({ where: { id }, data: { featured: String(value) === 'true' } });
      break;
    case 'title.enrich': {
      const title = await prisma.title.findUnique({ where: { id } });
      if (!title) return NextResponse.json({ error: 'Title not found' }, { status: 404 });
      const data = await fetchOmdb({ imdbId: title.imdbId, title: title.title, year: title.year });
      if (!data) return NextResponse.json({ error: 'OMDb se kuch nahi mila (key missing ya title not found)' }, { status: 400 });
      await prisma.title.update({
        where: { id },
        data: {
          imdbId: data.imdbId ?? title.imdbId,
          imdbRating: data.imdbRating ?? title.imdbRating,
          imdbVotes: data.imdbVotes ?? title.imdbVotes,
          rtRating: data.rtRating ?? title.rtRating,
          metascore: data.metascore ?? title.metascore
        }
      });
      break;
    }
    case 'review.delete':
      await prisma.review.delete({ where: { id } });
      break;
    case 'title.feature':
      await prisma.title.update({ where: { id }, data: { featured: value === 'true' } });
      break;
    case 'title.status': {
      const status = value === 'HIDDEN' ? 'HIDDEN' : 'PUBLISHED';
      await prisma.title.update({ where: { id }, data: { status } });
      break;
    }
    case 'user.role': {
      if (id === user.id) return NextResponse.json({ error: 'Apna role change nahi kar sakte' }, { status: 400 });
      const role = value === 'ADMIN' ? 'ADMIN' : 'USER';
      await prisma.user.update({ where: { id }, data: { role } });
      break;
    }
    case 'user.delete': {
      if (id === user.id) return NextResponse.json({ error: 'Apna account delete nahi kar sakte' }, { status: 400 });
      await prisma.user.delete({ where: { id } });
      break;
    }
    case 'comment.delete':
      await prisma.comment.delete({ where: { id } });
      break;
  }

  // Audit trail — every admin mutation is attributable.
  await prisma.adminLog
    .create({ data: { actor: user.email, action, target: id, meta: value ?? null } })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
