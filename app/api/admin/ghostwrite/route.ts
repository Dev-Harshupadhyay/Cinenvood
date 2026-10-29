import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, LIMITS } from '@/lib/rate-limit';
import { ghostwrite, draftBand } from '@/lib/ghostwrite';

const schema = z.object({
  titleId: z.string().min(1),
  notes: z.string().max(400).optional().default(''),
  rating: z.number().int().min(1).max(10).optional()
});

/** ADMIN only: draft a house-voice review in Hinglish + English (nothing is saved). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const gate = await rateLimit(`ghost:${user.id}`, LIMITS.ghostwrite.limit, LIMITS.ghostwrite.windowMs);
  if (!gate.ok) {
    return NextResponse.json(
      { error: `Draft limit — ${gate.retryAfter}s baad try karo` },
      { status: 429, headers: { 'retry-after': String(gate.retryAfter) } }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'titleId chahiye' }, { status: 400 });

  const film = await prisma.title.findUnique({ where: { id: parsed.data.titleId } });
  if (!film) return NextResponse.json({ error: 'Title not found' }, { status: 404 });

  const samples = await prisma.review.findMany({
    where: { editorial: true, body: { not: '' } },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { body: true }
  });

  const cast = (() => {
    try {
      return (JSON.parse(film.cast ?? '[]') as { name: string }[]).slice(0, 3).map((c) => c.name).join(', ');
    } catch {
      return '';
    }
  })();

  const draft = await ghostwrite({
    film: {
      title: film.title,
      year: film.year,
      genres: film.genres,
      overview: film.overview,
      runtime: film.runtime,
      director: film.director,
      cast,
      imdbRating: film.imdbRating
    },
    samples: samples.map((s) => ({ text: s.body })),
    notes: parsed.data.notes,
    ratingHint: parsed.data.rating ?? null
  });

  if (!draft) {
    return NextResponse.json(
      { error: 'AI draft nahi bana — GEMINI_API_KEY check karo ya thodi der baad try karo' },
      { status: 502 }
    );
  }

  return NextResponse.json({ draft, band: draftBand(draft.rating) });
}
