import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, LIMITS } from '@/lib/rate-limit';

const schema = z.object({
  titleId: z.string().min(1),
  trailerEn: z.string().max(20).optional().nullable(),
  trailerHi: z.string().max(20).optional().nullable()
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const gate = await rateLimit(`admin:trailer:${user.id}`, LIMITS.adminAction.limit, LIMITS.adminAction.windowMs);
  if (!gate.ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  const { titleId, trailerEn, trailerHi } = parsed.data;

  const clean = (s: string | null | undefined): string | null | false => {
    if (!s?.trim()) return null;
    const value = s.trim();
    const match = value.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    if (match) return match[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
    return false;
  };

  const en = clean(trailerEn);
  const hi = clean(trailerHi);
  if (en === false || hi === false) return NextResponse.json({ error: 'YouTube video ID/URL valid nahi hai.' }, { status: 400 });

  const title = await prisma.title.update({
    where: { id: titleId },
    data: { trailerEn: en, trailerHi: hi }
  });

  await prisma.adminLog.create({ data: { actor: user.email, action: 'title.trailer', target: titleId, meta: `${title.trailerEn ?? '-'} / ${title.trailerHi ?? '-'}` } });

  return NextResponse.json({ ok: true, title });
}
